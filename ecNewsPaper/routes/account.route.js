import express from 'express';
import bcrypt from 'bcryptjs';
import moment from 'moment';
import nodemailer from 'nodemailer';
import validator from 'validator';

//middleware
import auth from '../middlewares/auth.mdw.js';
import {authPremium} from '../middlewares/auth.mdw.js';

import userService from '../services/user.service.js';

const router = express.Router();


//
router.get('/is-available', async function(req, res){
    const username = req.query.username;
    if (!username || typeof username !== 'string') {
        return res.redirect('/404');
    }
    const user = await userService.findByUsername(username);
    if(!user){
        return res.json(true);
    }
    res.json(false);
})

//Login
router.get('/login', async function (req, res) {
  const message = req.query.message || false
  //console.log('Token gửi về form:', req.csrfToken());
    res.render('vwAccount/login', {
      layout: 'account_layout',
      showErrors: false, // Reset errors on the GET request
      message: message,
      //csrfToken: req.csrfToken()
    });
});
// Login route
router.post('/login', async function(req, res) {
  const username = req.body.username;
  if (!username || typeof username !== 'string') {
        return res.redirect('/404');
    }
  const user = await userService.findByUsername(username);

  if (!user) {
      return res.render('vwAccount/login', {
          layout: 'account_layout',
          showErrors: true,
          csrfToken: req.csrfToken()
      });
  }
  const rawPassword = req.body.raw_password;
    if (!rawPassword || typeof rawPassword !== 'string') {
      // Xử lý lỗi, ví dụ trả về lỗi hoặc redirect
      return res.status(400).send('Password is required and must be a string');
    }

  // Check password
  if (!bcrypt.compareSync(rawPassword, user.Password_hash)) {
      return res.render('vwAccount/login', {
          layout: 'account_layout',
          showErrors: true,
          csrfToken: req.csrfToken()
      });
  }

  // Check if the account is expired based on NgayHHPremium
  const expirationDate = moment(user.NgayHHPremium, 'YYYY-MM-DD HH:mm:ss');
  const currentDate = moment();
  if(user.Permission===0){
  if (currentDate.isAfter(expirationDate)) {
      return res.render('vwAccount/login', {
          layout: 'account_layout',     
          message:true,
          csrfToken: req.csrfToken()
      });
  }
  }
  // Set session variables after a successful login
  req.session.auth = true;
  req.session.authUser = user;
  req.session.authUser.DayOfBirth = moment(user.DayOfBirth, 'DD/MM/YYYY').format('YYYY-MM-DD');
  req.session.authUser.NgayDKPremium = moment(user.NgayDKPremium , 'DD/MM/YYYY').format('YYYY-MM-DD HH:mm:ss'),
  req.session.authUser.NgayHHPremium = moment(user.NgayHHPremium, 'DD/MM/YYYY').format('YYYY-MM-DD HH:mm:ss')
  // Clear retUrl if set, and redirect to the home page or wherever the user is supposed to go
  const retUrl = req.session.retUrl || '/';
  delete req.session.retUrl; // Xóa redirectUrl sau khi sử dụng
  res.redirect(retUrl);
});


//register
router.get('/register', async function (req, res) {
    res.render('vwAccount/register',{
        layout: 'account_layout',
        csrfToken: req.csrfToken()
    });
});

router.post('/register', async function(req, res){
    const ymd_dob = moment(req.body.raw_dob, 'DD/MM/YYYY').format('YYYY-MM-DD');
    const rawPassword = req.body.raw_password;
    if (!rawPassword || typeof rawPassword !== 'string') {
      // Xử lý lỗi, ví dụ trả về lỗi hoặc redirect
      return res.status(400).send('Password is required and must be a string');
    }
    const hash_password = bcrypt.hashSync(rawPassword,8);
    const entity={
        UserName: req.body.username,
        Password_hash: hash_password,
        Fullname: req.body.Fullname,
        Phone: req.body.Phone,
        Address: req.body.Address,
        Email: req.body.Email,
        DayOfBirth: ymd_dob,
        Permission: 0,
        NgayDKPremium: moment().format('YYYY-MM-DD HH:mm:ss'),
        NgayHHPremium: moment().add(7, 'days').format('YYYY-MM-DD HH:mm:ss')
    }

    const ret = await userService.add(entity);
    res.render('vwAccount/login',{
        layout: 'account_layout',
        csrfToken: req.csrfToken()
    });

})

//profile
router.get('/profile', authPremium, function (req, res) {
    res.locals.lcIsCenter = true;
    res.render('vwAccount/profile', {
      layout: 'account_layout',
      user: req.session.authUser,
      csrfToken: req.csrfToken()
    });
});

//chỉnh sửa profile
router.get('/patch', async function(req, res){
  res.locals.lcIsCenter = true;
  res.render('vwAccount/editProfile', {
    layout: 'account_layout',
    user: req.session.authUser,
    csrfToken: req.csrfToken()
  });
});

router.post('/patch', async function(req, res){
  const id =  req.session.authUser.UserID;
  const changes = {
      Fullname: req.body.Fullname,
      Address: req.body.Address,
      Phone: req.body.Phone,
      Email: req.body.Email,
      DayOfBirth: moment(req.body.DayOfBirth, 'DD/MM/YYYY').format('YYYY-MM-DD')
  }
  await userService.patch(id, changes);
  const user = await userService.findByUserID(id);
  req.session.authUser = user;
  //chỉnh hiện ngày sinh
  req.session.authUser.DayOfBirth = moment(req.session.authUser.DayOfBirth, 'DD/MM/YYYY').format('YYYY-MM-DD')
  res.redirect('/account/profile');
});

// Đổi mật khẩu - hiển thị form
router.get('/doimatkhau', authPremium, async function (req, res) {
  res.render('vwAccount/doimatkhau', {
      layout: 'account_layout',
      csrfToken: req.csrfToken()
  });
});

// Xử lý đổi mật khẩu
router.post('/doimatkhau', authPremium, async function (req, res) {
  const user = req.session.authUser;

  // Kiểm tra mật khẩu cũ
  if (!bcrypt.compareSync(req.body.old_password, user.Password_hash)) {
      return res.render('vwAccount/doimatkhau', {
          layout: 'account_layout',
          error: 'Mật khẩu cũ không chính xác.',
          csrfToken: req.csrfToken()
      });
  }

  // Kiểm tra mật khẩu mới và xác nhận mật khẩu
  if (req.body.new_password !== req.body.confirm_password) {
      return res.render('vwAccount/doimatkhau', {
          layout: 'account_layout',
          error: 'Mật khẩu mới và xác nhận không trùng khớp.',
          csrfToken: req.csrfToken()
      });
  }

  // Cập nhật mật khẩu mới
  const newPasswordHash = bcrypt.hashSync(req.body.new_password, 8);
  await userService.updatePasswordbyID(user.UserID, newPasswordHash);

  res.render('vwAccount/doimatkhau', {
      layout: 'account_layout',
      success: 'Đổi mật khẩu thành công!',
      csrfToken: req.csrfToken()
  });
});

//log out
router.post('/logout', authPremium, function (req, res) {
    req.session.auth = false;
    req.session.authUser = null;
    res.redirect(req.headers.referer || '/');
});

//Quên mật khẩu
router.get('/quenmatkhau', function (req, res) {
    res.render('vwAccount/quenmatkhau', {
        layout: 'account_layout',
        csrfToken: req.csrfToken()
    });
});
  
router.post('/quenmatkhau', async function (req, res) {
    const email = req.body.email;
    const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!regex.test(email)) {
      return res.redirect('/404');
    }

    const user = await userService.findByEmail(email);
    if (!user) {
      return res.redirect('/404');
    }
  
    const fullname = user.Fullname || 'User'; // Lấy Fullname, nếu không có thì mặc định là 'User'
  
    // Cấu hình transport cho nodemailer
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false, // true for port 465, false for other ports
      auth: {
        //user: 'tinntunn4ever@gmail.com', // Thay bằng email của bạn
        //pass: 'ilcdwnkkxunmolmy'   // Thay bằng mật khẩu ứng dụng (App Password)

        user: 'appmusic112@gmail.com', // Thay bằng email của bạn
        pass: 'svjjenshuatgfydk'   // Thay bằng mật khẩu ứng dụng (App Password)
      }
    });
  
    function generateOTP() {
      return Math.floor(100000 + Math.random() * 900000).toString(); // Tạo 6 số ngẫu nhiên
    }
  
    const otpCode = generateOTP(); // Gọi hàm tạo OTP
    const otpExpiry = Date.now() + 3 * 60 * 60 * 1000; // Hết hạn trong 3 giờ
  
     // Lưu OTP vào session
     req.session.otp = {
      code: otpCode,
      email: email,
      expiresAt: otpExpiry
    };
  
    
    // Nội dung email
    const mailOptions = {
      from: 'appmusic112@gmail.com', // Địa chỉ email gửi
      to: email,                    // Email người nhận
      subject: 'Forgot Password Assistance',
      html: `
      <p>Dear ${fullname},</p>
      <p>Your verification OTP code is:</p>
      <h2 style="color: #333;">${otpCode}</h2>
      <p>This code will expire in <strong>3 hours</strong>.</p>
      <p>Thank you!</p>
      `
    };
  
    try {
      // Gửi email
      await transporter.sendMail(mailOptions);
      console.log(`Email sent to ${email}`);
      req.session.resetEmailsub = email; // Lưu email để gửi lại OTP
      res.redirect('/account/verifyOTP'); // Chuyển tới trang nhập OTP
    } catch (err) {
      console.error('Error sending email:', err);
      res.render('vwAccount/quenmatkhau', {
        layout: 'account_layout',
        message: 'Error sending email. Please try again later.',
        csrfToken: req.csrfToken()
      });
    }
});
  
router.get('/is-email-available', async function (req, res) {
    const email = req.query.email;
    const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$/;
    if (!regex.test(email)) {
      return res.redirect('/404');
    }
    const user = await userService.findByEmail(email); // Tìm email trong cơ sở dữ liệu
    if (user) {
      return res.json(true); // Email tồn tại
    }
    res.json(false); // Email không tồn tại
});
  
router.get('/verifyOTP', function (req, res) {
    res.render('vwAccount/verifyOTP', { 
        layout: 'account_layout',
        message: null,
        csrfToken: req.csrfToken()
    }); // Trang nhập OTP
});
  
router.post('/verifyOTP/confirm', function (req, res) {
    const { otp } = req.body;
    if (!/^\d{6}$/.test(otp)) {
      return res.render('vwAccount/verifyOTP', {
        layout: 'account_layout',
        message: 'Invalid OTP format.',
        csrfToken: req.csrfToken()
      });
    }

    const sessionOtp = req.session.otp;
  
    if (!sessionOtp) {
      return res.render('vwAccount/verifyOTP', { 
        layout: 'account_layout',
        message: 'No OTP found. Please request again.',
        csrfToken: req.csrfToken()
    });
    }
  
    const { code, expiresAt, email } = sessionOtp;
  
    // Kiểm tra OTP và thời gian hết hạn
    if (Date.now() > expiresAt) {
      return res.render('vwAccount/verifyOTP', {
        layout: 'account_layout',
        message: 'OTP has expired. Please request again.',
        csrfToken: req.csrfToken()
    });
    }
  
    if (otp !== code) {
      return res.render('vwAccount/verifyOTP', { 
        layout: 'account_layout',
        message: 'Invalid OTP. Please try again.',
        csrfToken: req.csrfToken()
    });
    }
  
    // OTP hợp lệ, lưu email vào session để đổi mật khẩu
    req.session.resetEmail = email;
    delete req.session.otp; // Xóa OTP sau khi xác minh thành công
  
    res.redirect('/account/resetpassword'); // Chuyển đến trang đổi mật khẩu
});
  
router.post('/resendOTP', async function (req, res) {
    const email = req.session.resetEmailsub; // Lấy email từ session
    console.log("Email to search:", email);
    const user = await userService.findByEmail(email);
    if (!user) {
      return res.redirect('/404');
    }
  
    const fullname = user.Fullname || 'User'; // Lấy Fullname, nếu không có thì mặc định là 'User'
  
  
    if (!email) {
      return res.json({ success: false, message: 'No email found. Please request OTP again.' });
    }
  
    function generateOTP() {
      return Math.floor(100000 + Math.random() * 900000).toString(); // Tạo 6 số ngẫu nhiên
    }
  
    // Tạo mã OTP mới
    const otpCode = generateOTP();
    const otpExpiry = Date.now() + 3 * 60 * 60 * 1000; // Hết hạn sau 3 giờ
  
    // Lưu OTP vào session
    req.session.otp = {
      code: otpCode,
      email: email,
      expiresAt: otpExpiry
    };
  
    // Cấu hình transport cho nodemailer
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false, 
      auth: {
        user: 'tinntunn4ever@gmail.com',
        pass: 'ilcdwnkkxunmolmy'
      }
    });
  
    const mailOptions = {
      from: 'tinntunn4ever@gmail.com',
      to: email,
      subject: 'Forgot Password Assistance',
      html: `
        <p>Dear ${fullname},</p>
        <p>Your new verification OTP code is:</p>
        <h2 style="color: #333;">${otpCode}</h2>
        <p>This code will expire in <strong>3 hours</strong>.</p>
        <p>Thank you!</p>
      `
    };
  
    try {
      await transporter.sendMail(mailOptions);
      return res.json({ success: true, message: 'A new OTP has been sent to your email.' });
    } catch (err) {
      console.error('Error sending OTP:', err);
      return res.json({ success: false, message: 'Failed to resend OTP. Please try again.' });
    }
});
  
router.get('/resetpassword', function (req, res) {
    if (!req.session.resetEmail) {
      return res.redirect('/account/quenmatkhau'); // Nếu không có email, yêu cầu gửi OTP lại
    }
    res.render('vwAccount/resetpassword', { 
        layout: 'account_layout',
        message: null,
        csrfToken: req.csrfToken()
    });
});
  
router.post('/resetpassword', async function (req, res) {
    const { password, confirmPassword } = req.body;
    const email = req.session.resetEmail;
  
    if (!email) {
      return res.redirect('/account/quenmatkhau');
    }
  
    // Kiểm tra mật khẩu trùng khớp
    if (password !== confirmPassword) {
      return res.render('vwAccount/resetpassword', { 
        layout: 'account_layout',
        message: 'Passwords do not match.',
        csrfToken: req.csrfToken()
    });
    }
  
    // Mã hóa mật khẩu trước khi lưu (nếu cần)
    const hashedPassword = await bcrypt.hash(password, 8); // Import bcrypt trước khi sử dụng
  
    // Cập nhật mật khẩu trong database
    await userService.updatePasswordByEmail(email, hashedPassword);
  
    // Xóa session
    delete req.session.resetEmail;
    delete req.session.resetEmailsub;
  
    res.render('vwAccount/resetpassword', { 
        layout: 'account_layout',
        message: 'Password reset successfully!',
        csrfToken: req.csrfToken()
    });
});
  
  

export default router;