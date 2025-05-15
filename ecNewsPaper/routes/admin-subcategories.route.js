import express from 'express';

import categoryService from "../services/category.service.js";



const router =express.Router();

// Hiển thị danh sách subcategories theo CID
router.get('/', async function (req, res) {
    const id = req.query.id || 0;

    const categories = await categoryService.findCategoriesByCID(id);
    const subcategories = await categoryService.findSubCategoriesByCID(id);

    res.render('vwAdmin/subcategories', {
        subcategories,
        categories,
        cid : id
    });
});

// Thêm subcategory
router.post('/add', async function (req, res) {
    const cid = req.body.cid || 0;
    
    const newSubCategory = {
        SCName: req.body.SCName,
        CID: req.body.cid,
    };
    await categoryService.addSubcategory(newSubCategory);
    res.redirect(`/admin/categories/subcategories?id=${cid}`);
});

// Xóa subcategory
router.post('/delete', async function (req, res) {
    const cid = req.body.cid ;

    const { SCID } = req.body;
    await categoryService.deleteSubcategory(SCID);
    res.redirect(`/admin/categories/subcategories?id=${cid}`);
});

// Sửa subcategory
router.post('/edit', async function (req, res) {
    const cid = req.body.cid ;
    const updatedSubcategory = {
        SCID: req.body.SCID,
        SCName: req.body.SCName
    };
    await categoryService.updateSubcategory(updatedSubcategory);
    res.redirect(`/admin/categories/subcategories?id=${cid}`);
});



export default router;