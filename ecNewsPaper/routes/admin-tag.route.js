import express from 'express';
import tagService from '../services/tag.service.js';

const router = express.Router();

// Hiển thị danh sách tag
router.get('/', async function (req, res) {
    const nRows = await tagService.countAllTag();
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
    const tags = await tagService.findAllTag(limit, offset);
    res.render('vwAdmin/tags', {
        pageNumbers:pageNumbers,
        needPagination: nPages > 1,
        current_page: current_page,
        totalPages: nPages,
        tags,
        csrfToken: req.csrfToken()
    });
});

// Thêm tag
router.post('/add', async function (req, res) {
    const newTag = {
        TName: req.body.TName
    };
    await tagService.addTag(newTag);
    res.redirect('/admin/tags');
});

// Xóa tag
router.post('/delete', async function (req, res) {
    const { TagID } = req.body;
    await tagService.deleteTag(TagID);
    res.redirect('/admin/tags');
});

// Sửa tag
router.post('/edit', async function (req, res) {
    const updatedTag = {
        TagID: req.body.TagID,
        TName: req.body.TName
    };
    await tagService.updateTag(updatedTag);
    res.redirect('/admin/tags');
});

export default router;