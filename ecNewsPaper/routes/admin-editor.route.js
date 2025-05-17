import express from 'express';
import userService from '../services/user.service.js';
import categoryService from '../services/category.service.js';
import bcrypt from 'bcryptjs';
import moment from 'moment';

const router = express.Router();

// Hiển thị danh sách danh mục
router.get('/', async function (req, res) {
    const nRows = await userService.countAllEditors();
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
    const editors = await userService.findEditors(limit, offset);
    res.render('vwAdmin/accountList', {
        pageNumbers:pageNumbers,
        needPagination: nPages > 1,
        current_page: current_page,
        totalPages: nPages,
        users: editors,
        permission: 2,
        csrfToken: req.csrfToken()

    });
});

router.get('/profile', async function (req, res){
    const userID = req.query.id || 0 ;
    const writer =  await userService.findByUserID(userID);
    writer.DayOfBirth =  moment(writer.DayOfBirth, 'DD/MM/YYYY').format('YYYY-MM-DD');
    writer.NgayDKPremium = moment(writer.NgayDKPremium , 'DD/MM/YYYY').format('YYYY-MM-DD HH:mm:ss'),
    res.render('vwAdmin/accountDetail', {
        user: writer,
        csrfToken: req.csrfToken()
    });
    
});

//register
router.get('/register', async function (req, res) {
    res.render('vwAccount/register',{
        csrfToken: req.csrfToken()
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
        Permission: 2,
        NgayDKPremium: moment().format('YYYY-MM-DD HH:mm:ss'),
    }

    const ret = await userService.add(entity);
    res.redirect('/admin/editor');

})

//danh sách chuyên mục
router.get('/categories', async function (req, res) {
    const editorID = req.query.editorID || 0;
    const editor = await userService.findByUserID(editorID);
    const catNotManaged = await categoryService.findCategoriesNotManagedByEID(editorID);
    const nRows = await categoryService.countCategoriesByEID(editorID);
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
    
    const categories = await categoryService.findCategoriesByEID(editorID, limit, offset);
    res.render('vwAdmin/editorCategories',{
        pageNumbers:pageNumbers,
        needPagination: nPages > 1,
        current_page: current_page,
        totalPages: nPages,
        catNotManaged,
        categories,
        editor,
        csrfToken: req.csrfToken()
    });
});

// Xóa 
router.post('/delete', async function (req, res) {
    const userID  = req.body.userID;
    await userService.delete(userID);
    res.redirect('/admin/editor');
});

//thêm chuyên mục quản lý
router.post('/addCat', async function (req, res) {
    const CID  = req.body.CID;
    const EID  = req.body.EID;
    await categoryService.addManageCategory(CID, EID);
    res.redirect(`/admin/editor/categories?editorID=${EID}`);
});

//xoá chuyên mục quản lý
router.post('/delCat', async function (req, res) {
    const CID  = req.body.CID;
    const EID  = req.body.EID;
    await categoryService.delManageCategory(CID);
    res.redirect(`/admin/editor/categories?editorID=${EID}`);
});

export default router;