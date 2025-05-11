import express from 'express';

import categoryService from "../services/category.service.js";



const router =express.Router();

// Hiển thị danh sách danh mục
router.get('/', async function (req, res) {
    const nRows = await categoryService.countAllCategories();
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
    const categories = await categoryService.findCategoriesWithLimitOffset(limit, offset);
    res.render('vwAdmin/categories', {
        pageNumbers:pageNumbers,
        needPagination: nPages > 1,
        current_page: current_page,
        totalPages: nPages,
        categories

    });
});

// Thêm danh mục
router.post('/add', async function (req, res) {
    const newCategory = {
        CName: req.body.CName
    };
    await categoryService.addCategories(newCategory);
    res.redirect('/admin/categories');
});

// Xóa danh mục
router.post('/delete', async function (req, res) {
    const { CID } = req.body;
    await categoryService.deleteCategories(CID);
    res.redirect('/admin/categories');
});

// Sửa danh mục
router.post('/edit', async function (req, res) {
    const updatedCategory = {
        CID: req.body.CID,
        CName: req.body.CName
    };
    await categoryService.updateCategories(updatedCategory);
    res.redirect('/admin/categories');
});

export default router;