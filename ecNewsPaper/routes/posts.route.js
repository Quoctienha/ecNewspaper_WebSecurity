import express from 'express';
import postService from "../services/post.service.js";
import categoryService from "../services/category.service.js";
import commentService from '../services/comment.service.js';
import tagService from '../services/tag.service.js';
import moment from 'moment';
import fs from 'fs';
import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import { decode } from 'html-entities'; 
import validator from 'validator';


//middlewares
import auth from '../middlewares/auth.mdw.js';
import { authPremium } from '../middlewares/auth.mdw.js';


const router = express.Router();
//Xác định thư mục hiện tại của tệp
import path from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

router.get('/bySubcategory', async function (req, res) {
  const subCategoryId = parseInt(req.query.id) || 0;
  if (!subCategoryId || subCategoryId <= 0) {
    return res.redirect('/404');
  }
  const subCategory = await categoryService.findSubCategoriesBySCID(subCategoryId);
  if (!subCategory) {
    return res.redirect('/404');
  }


  const nRows = await postService.countBySubCatId(subCategoryId);
  const limit = parseInt(2);
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

  const posts = await postService.findPostsBySCID(subCategoryId, limit, offset);
  for (let post of posts) {
      // Định dạng thời gian cho từng post
      post.TimePublic = moment(post.TimePublic).format('DD/MM/YYYY HH:mm:ss');
      // Truy vấn các tag của bài viết
      const tags = await tagService.findTagByPostID(post.PostID); 
      // Thêm tags vào bài viết
      post.Tags = tags.map(tag => ({
        TagID: tag.TagID,
        TName: tag.TName
      }));
    }
  res.render('vwPost/byCat', {
    title: subCategory.SCName,
    pageNumbers:pageNumbers,
    needPagination: nPages > 1,
    current_page: current_page,
    posts: posts,
    totalPages: nPages,
    catID: subCategoryId,
    isBySubCat: true,
    csrfToken: req.csrfToken()
  });
});

router.get('/byCategory', async function( req, res) {
  const categoryId = parseInt(req.query.id) || 0;
  if (!categoryId || categoryId <= 0) {
      return res.redirect('/404');
    }
  const category = await categoryService.findCategoriesByCID(categoryId);
  if (!category) {
    return res.redirect('/404');
  }

  const nRows = await postService.countByCatId(categoryId);
  const limit = parseInt(2);
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
  const posts = await postService.findPostsByCID(categoryId, limit, offset);
  for (let post of posts) {
    // Định dạng thời gian cho từng post
    post.TimePublic = moment(post.TimePublic).format('DD/MM/YYYY HH:mm:ss');
    // Truy vấn các tag của bài viết
    const tags = await tagService.findTagByPostID(post.PostID); 
    // Thêm tags vào bài viết
    post.Tags = tags.map(tag => ({
      TagID: tag.TagID,
      TName: tag.TName
    }));
  }
  res.render('vwPost/byCat', {
    title: category.CName,
    pageNumbers:pageNumbers,
    needPagination: nPages > 1,
    current_page: current_page,
    posts: posts,
    totalPages: nPages,
    catID: categoryId,
    isBySubCat: false,
    csrfToken: req.csrfToken()
  });

  
});

router.get('/byTag', async function(req, res) {
  const tagID = parseInt(req.query.id) || 0;
   if (!tagID || tagID <= 0) {
      return res.redirect('/404');
    }
  const tag = await tagService.findTagBytagID(tagID);
  if (!tag) {
    return res.redirect('/404');
  }
  const nRows = await tagService.countByTagId(tagID);
  const limit = parseInt(2);
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

  const posts = await tagService.findPostByTagID(tagID, limit, offset);
  if (!posts) {
    return res.redirect('/404');
  }
  for (let post of posts) {
    // Định dạng thời gian cho từng post
    post.TimePublic = moment(post.TimePublic).format('DD/MM/YYYY HH:mm:ss');
    // Truy vấn các tag của bài viết
    const tags = await tagService.findTagByPostID(post.PostID); 
    // Thêm tags vào bài viết
    post.Tags = tags.map(tag => ({
      TagID: tag.TagID,
      TName: tag.TName
    }));
   }
   res.render('vwPost/byTag', {
    title: tag.TName,
    pageNumbers:pageNumbers,
    needPagination: nPages > 1,
    current_page: current_page,
    posts: posts,
    totalPages: nPages,
    TagID: tagID,
    csrfToken: req.csrfToken()
  });

});

router.get('/bySearch', async function(req, res) {
  let keyword = req.query.keyword || '';

   if (!keyword || !keyword.trim()) {
    return res.status(400).json({ error: 'Keyword is required' });
  }
  // Sanitize keyword tránh HTML + SQL injection cơ bản
  keyword = validator.escape(keyword.trim());

  const nRows = await postService.countBySearch(keyword);
  const limit = parseInt(2);
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

  const posts = await postService.searchPosts(keyword, limit, offset)
  for (let post of posts) {
    // Định dạng thời gian cho từng post
    post.TimePublic = moment(post.TimePublic).format('DD/MM/YYYY HH:mm:ss');
    // Truy vấn các tag của bài viết
    const tags = await tagService.findTagByPostID(post.PostID); 
    // Thêm tags vào bài viết
    post.Tags = tags.map(tag => ({
      TagID: tag.TagID,
      TName: tag.TName
    }));
   }
   res.render('vwPost/bySearch', {
    title: `Tìm kiếm: ${keyword}`,
    pageNumbers:pageNumbers,
    needPagination: nPages > 1,
    current_page: current_page,
    posts: posts,
    totalPages: nPages,
    keyword: keyword,
    //csrfToken: req.csrfToken()
  });

});

//Note: không gọi trực tiếp /detail nếu không cần thiết, gọi /IncreaseView để tăng view cho post
router.get('/detail', async function (req, res) {
    const postId = parseInt(req.query.id) || 0;
    if (!postId || postId <= 0) {
      return res.redirect('/404');
    }
    const post = await postService.findPostsByPostID(postId); 

    if (!post) {
      return res.redirect('/404');
    }
    
    let UserID = 0;
    if(req.session.authUser){
      UserID = req.session.authUser.UserID;
    }
    // Định dạng thời gian cho từng post
    post.TimePublic = moment(post.TimePublic).format('DD/MM/YYYY HH:mm:ss');
    // Truy vấn các tag của bài viết
    const tags = await tagService.findTagByPostID(post.PostID); 
    // Thêm tags vào bài viết
    post.Tags = tags.map(tag => ({
      TagID: tag.TagID,
      TName: tag.TName
    }));
    const limit = parseInt(2);
    const totalComments = await commentService.countByPostID(postId);
    const nPages = Math.ceil(totalComments.total / limit);
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

    const comments = await commentService.findCommentByPostID(postId, limit, offset);
    // Định dạng thời gian cho từng bình luận
    comments.forEach(comment => {
      comment.Date = moment(comment.Date).format('DD/MM/YYYY HH:mm:ss');
    });

    // Kiểm tra nếu bài viết là premium
    if (post.Premium) {
      authPremium(req, res, async () => {
        res.render('vwPost/detail', {
        post: post,
        current_page:current_page,
        pageNumbers: pageNumbers,
        needPagination: nPages > 1,
        totalPages: nPages,
        comments: comments,
        UserID: UserID,
        csrfToken: req.csrfToken()
        });
      });
    } 
    else {
      // Bài viết không phải premium
      res.render('vwPost/detail', {
      post: post,
      current_page:current_page,
      pageNumbers: pageNumbers,
      needPagination: nPages > 1,
      totalPages: nPages,
      comments: comments,
      UserID: UserID,
      csrfToken: req.csrfToken()
      });
    }
    
});

//tăng view cho post
router.get('/IncreaseView', async function( req, res) {
  const postId = parseInt( req.query.id) || 0;
  if (!postId || postId <= 0) {
    return res.redirect('/404');
  }
  const post = await postService.findPostsByPostID(postId); 

  if (!post) {
    return res.redirect('/404');
  }
  //update view
  await postService.IncreaseView(postId);
   // Chuyển hướng tới trang chi tiết bài viết
   res.redirect(`/posts/detail?id=${postId}`);
});

//Comment
//thêm comment
router.post('/addComment',authPremium, async function(req, res) {
  const PostID = parseInt(req.body.PostID) || 0;
  if (!PostID || PostID <= 0) {
    return res.redirect('/404');
  }
  const post = await postService.findPostsByPostID(PostID); 

  if (!post) {
    return res.redirect('/404');
  }
  const UID = req.session.authUser.UserID; // Lấy ID người dùng từ session
  let Comment = (req.body.Comment || '').trim(); // Loại bỏ khoảng trắng thừa
  Comment = validator.escape(Comment); // sanitizedComment

  // Lấy thời gian hiện tại với moment
  const Date = moment().format('YYYY-MM-DD HH:mm:ss');

  const entity = { UID, PostID, Comment, Date};

  const ret = await commentService.add(entity);
  res.redirect(`/posts/detail?id=${PostID}`);
});

router.get('/addComment', async function(req, res) {
  const postId = parseInt(req.query.PostID) || 0;
  if (!postId || postId <= 0) {
    return res.redirect('/404');
  }
  res.redirect(`/posts/detail?id=${postId}`);
});

//Xoá
router.post('/delComment', async function (req, res) {
  const ComID = parseInt(req.body.ComID) || 0;
  const postID = parseInt(req.body.PostID) || 0;
  if (!ComID || ComID <= 0 || !postID || postID <= 0) {
    return res.redirect('/404');
  }
  await commentService.delete(ComID);
  res.redirect(`/posts/detail?id=${postID}`);
});

router.get('/downloadPDF', authPremium, async function (req, res) {
  // 1. Validate ID strictly as a positive integer
  if (!validator.isInt(req.query.id + '', { min: 1 })) {
    return res.status(400).send('Invalid post ID');
  }
  const postId = Number(req.query.id);

  // 2. Fetch the post and bail if missing
  const post = await postService.findPostsByPostID(postId);
  if (!post) {
    return res.redirect('/404');
  }

  // 3. Decode content and format time
  post.Content = decode(post.Content);
  post.TimePublic = moment(post.TimePublic).format('DD/MM/YYYY HH:mm:ss');

  // 4. Load tags
  const tags = await tagService.findTagByPostID(post.PostID);
  post.Tags = tags.map(tag => ({ TagID: tag.TagID, TName: tag.TName }));

  // 5. Build a filesystem path (no URL here!)
  const imagePath = path.join(
    __dirname,      // .../routes
    '..',           // up to project root
    'static',
    'imgs',
    'posts',
    String(postId),
    `${postId}_1.jpg`
  );

  // 6. Read the image or 404
  let imageBase64;
  try {
    imageBase64 = fs.readFileSync(imagePath, 'base64');
  } catch (err) {
    return res.status(404).send('Post image not found');
  }
  const imageSrc = `data:image/jpg;base64,${imageBase64}`;

  // 7. Generate PDF via Puppeteer
  const htmlContent = `
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; }
          h1 { text-decoration: underline; font-size: 24px; }
          .info { font-size: 14px; margin-bottom: 10px; }
        </style>
      </head>
      <body>
        <img src="${imageSrc}" style="max-width:100%;height:auto;margin-top:20px;">
        <h1>${post.PostTitle}</h1>
        <p class="info">Ngày công khai: ${post.TimePublic}</p>
        <p class="info">Chuyên mục: ${post.CName} > ${post.SCName}</p>
        <p class="info">Tags: ${post.Tags.map(t=>t.TName).join(', ')}</p>
        <p class="info">Tóm tắt:</p>
        <div>${post.SumContent}</div>
        <hr>
        <div>${post.Content}</div>
      </body>
    </html>
  `;

  try {
    const browser = await puppeteer.launch();
    const page    = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'load' });
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
    await browser.close();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=post_${postId}.pdf`);
    res.end(pdfBuffer);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error generating PDF');
  }
});


export default router;