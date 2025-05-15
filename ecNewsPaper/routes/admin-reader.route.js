import express from 'express';
import userService from '../services/user.service.js';
import bcrypt from 'bcryptjs';
import moment from 'moment';

const router = express.Router();

// Hiển thị danh sách danh mục
router.get('/', async function (req, res) {
    const nRows = await userService.countAllReaders();
    const limit = parseInt(5);
    const nPages = Math.ceil(nRows.total / limit);
    //current page
    const current_page =  Math.max(1, parseInt(req.query.page) || 1);
    //offset
    const offset = (current_page - 1) * limit;  
    // Xác định dải trang hiển thị
    const startPage = Math.max(1, current_page - 1); // Trang bắt đầu
    const endPage = Math.min(nPages, current_page + 1); // Trang kết thúc

    const pageNumbers = [];    
    for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push({
            value: i,
            active:i === +current_page
        });
    }
    const readers = await userService.findReaders(limit, offset);
    res.render('vwAdmin/accountList', {
        pageNumbers:pageNumbers,
        needPagination: nPages > 1,
        current_page: current_page,
        totalPages: nPages,
        users: readers,
        permission: 0

    });
});

router.get('/profile', async function (req, res){
    const userID = req.query.id || 0 ;
    const reader =  await userService.findByUserID(userID);
    reader.DayOfBirth =  moment(reader.DayOfBirth, 'DD/MM/YYYY').format('YYYY-MM-DD');
    reader.NgayDKPremium = moment(reader.NgayDKPremium , 'DD/MM/YYYY').format('YYYY-MM-DD HH:mm:ss'),
    reader.NgayHHPremium = moment(reader.NgayHHPremium, 'DD/MM/YYYY').format('YYYY-MM-DD HH:mm:ss')
    res.render('vwAdmin/accountDetail', {
        user: reader
    });
    
});

//register
router.get('/register', async function (req, res) {
    res.render('vwAccount/register',{
    });
});

router.post('/register', async function(req, res){
    const ymd_dob = moment(req.body.raw_dob, 'DD/MM/YYYY').format('YYYY-MM-DD');
    const hash_password = bcrypt.hashSync(req.body.raw_password,8);
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
    res.redirect('/admin/reader');

})

//gia hạn
router.post('/extend', async function(req, res){
    const userID = req.body.userID;
    const change ={
        NgayHHPremium: moment().add(7, 'days').format('YYYY-MM-DD HH:mm:ss')
    };
    await userService.patch(userID, change);
    res.redirect('/admin/reader');
});

// Xóa 
router.post('/delete', async function (req, res) {
    const userID  = req.body.userID;
    await userService.delete(userID);
    res.redirect('/admin/reader');
});

export default router;