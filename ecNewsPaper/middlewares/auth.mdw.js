import moment from "moment";

export default function (req, res, next) {
    if (req.session.auth === false) {
      req.session.retUrl = req.originalUrl;
      return res.redirect('/account/login');
    }
  
    next();
  }


  export function authPremium(req, res, next) {
    if (req.session.auth === false) {
      req.session.retUrl = req.originalUrl;
      return res.redirect('/account/login');
    }
    const expirationDate = moment(req.session.authUser.NgayHHPremium, 'YYYY-MM-DD HH:mm:ss');
    const currentDate = moment();
    if (req.session.authUser.Permission === 0 && currentDate.isAfter(expirationDate)) {
      // nên redirect về trang thông báo lỗi "thiếu quyền "
      req.session.auth = false;
      req.session.authUser = null;
      return res.redirect('/account/login?message=true');
    }
  
    next();
  }

  export function authAdmin(req, res, next) {
    if (req.session.auth === false) {
      req.session.retUrl = req.originalUrl;
      return res.redirect('/account/login');
    }
    
    if (req.session.authUser.Permission < 3) {
      return res.redirect('/403');
    }
    res.locals.lcIsAdminPage = true;
    next();
  }
  // Middleware kiểm tra quyền biên tập viên (Editor)
export function ensureEditor(req, res, next) {
  if (req.session.auth === false) {
    req.session.retUrl = req.originalUrl;
    return res.redirect("/account/login");
  }
  if (req.session.authUser.Permission !== 2) {
    // Giả sử Permission = 2 là quyền Editor
    return res.redirect('/403');
  }
  next();
}
export function ensureWriter(req, res, next) {
  if (req.session.auth === false) {
    req.session.retUrl = req.originalUrl;
    return res.redirect("/account/login");
  }
  if (req.session.authUser.Permission !== 1) {
    // Giả sử Permission = 1 là quyền writer
    return res.redirect('/403');

  }
  next();
}