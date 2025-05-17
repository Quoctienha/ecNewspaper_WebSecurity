import express from 'express';
import postService from '../services/post.service.js';
import moment from 'moment';
import auth from '../middlewares/auth.mdw.js';
import multer  from 'multer'

import fs  from 'fs'
import path  from 'path'
import { fileURLToPath } from 'url';
import tagService from '../services/tag.service.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const router = express.Router();
router.use(express.json());
// Route to display all posts for a writer
router.get('/',  async (req, res) => {
    const status = req.query.status || "Chờ duyệt";
    const userUID = req.session.authUser.UserID;  // Get the UID stored in session during login
    const nRows = await postService.countPostsByUIDAndStatus(userUID, status)

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


    //console.log(status);
    //console.log(userUID);  // Logging the UID to check if it’s correct

    // Fetch posts by UID
   const posts = await postService.findPostsByUserID(userUID,status, limit, offset);
   const postsDeniedReason=await postService.postsDeniedReason(userUID);
  
   posts.forEach(post => {
        post.TimePost = moment(post.TimePost).format('DD/MM/YYYY HH:mm:ss');
    });
    res.render('vwWriter/posts', {
        pageNumbers:pageNumbers,
        needPagination: nPages > 1,
        current_page: current_page,
        totalPages: nPages,
        status,
        posts,
        csrfToken: req.csrfToken()
    });

});



// Display form to add a new post
router.get('/add',  async (req, res) => {
    const categories = await postService.findAllCategories();
    const subcategories = await postService.findAllSubcategories();
    const tags = await tagService.findAllTag();
    console.log(tags);
    res.render('vwWriter/addPost', { categories, subcategories, tags, csrfToken: req.csrfToken() });
});



router.use(express.urlencoded({ extended: true }));

router.post('/add', auth, async (req, res) => {
    const newPost = {
        PostTitle: req.body.PostTitle,
        CID: req.body.CID,
        SCID: req.body.SCID || null,
        UID: req.session.authUser.UserID,
        TimePost: new Date(),
        SumContent: req.body.SumContent,
        Content: req.body.Content,
        source: req.body.source,
        linksource: req.body.linksource,
        view: 0,
        StatusPost: 'Chờ duyệt',
        Reason: req.body.Reason || null,
        TimePublic: req.body.TimePublic || null,
        Premium: req.body.Premium || 0,
    };

    try {
        // Step 1: Insert the post and retrieve the PostID
        const postID = await postService.addPost(newPost);
        if(req.body.Tags)
        {
            const tags = Array.isArray(req.body.Tags) ? req.body.Tags : req.body.Tags.split(',');
    

            for (const tagID of tags) {
                await tagService.insertTagsToPost(postID, tagID);
            }
        }
        // Step 2: Insert tags into post_tags
        

        // Redirect to upload photo
        res.redirect(`/writer/uploadphoto?postID=${postID}`);
    } catch (error) {
        console.error('Error inserting post:', error);
        res.status(500).send('Error saving post to database');
    }
});

router.get('/uploadphoto', auth, (req, res) => {
    const postID = req.query.postID;

    if (!postID) {
        return res.status(400).send('Post ID is required');
    }

    res.render('vwWriter/uploadphoto', { postID,csrfToken: req.csrfToken() });
});

// Cấu hình multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const postID = req.body.postID; // Lấy `postID` từ form
        if (!postID) {
            return cb(new Error('Post ID not available'), null);
        }

        const postDir = path.join(__dirname, '../static/imgs/posts', `${postID}`);

        // Tạo thư mục nếu chưa tồn tại
        if (!fs.existsSync(postDir)) {
            fs.mkdirSync(postDir, { recursive: true });
        }
        cb(null, postDir);
    },
    filename: function (req, file, cb) {
        const postID = req.body.postID; // Lấy `postID` từ form
        const postDir = path.join(__dirname, '../static/imgs/posts', `${postID}`);

        // Đếm số lượng các file hiện tại trong thư mục
        fs.readdir(postDir, (err, files) => {
            if (err) {
                return cb(err);
            }

            // Lọc các file ảnh và lấy số thứ tự tiếp theo
            const imageFiles = files.filter(file => file.endsWith(path.extname(file)));
            const fileNumber = imageFiles.length + 1; // Số thứ tự của file mới

            // Tạo tên file theo định dạng: PostID_sothutu.jpg
            const fileExtension = path.extname(file.originalname); // Lấy phần mở rộng của file
            const fileName = `${postID}_${fileNumber}${fileExtension}`;

            cb(null, fileName);
        });
    },
});

const upload = multer({ storage });

// Route POST xử lý upload ảnh
router.post('/uploadphoto', auth, upload.single('fuMain'), (req, res) => {
    try {
        console.log('Uploaded files:', req.files);
        const postID = req.body.postID;
// Tạo message thông báo thành công
        const message = `Upload thành công! Ảnh đã được lưu cho bài viết với Post ID: ${postID}`;

        // Truyền message và postID lại vào view
        res.redirect('/writer');
    } catch (error) {
        console.error('Error uploading files:', error);

        // Tạo message thông báo lỗi
        const message = 'Có lỗi xảy ra khi upload ảnh. Vui lòng thử lại.';

        // Truyền message và postID lại vào view
        res.render('vwWriter/uploadphoto', {csrfToken: req.csrfToken()});
    }
});



// Route for updating a post
router.post('/edit',  async (req, res) => {
    try {
        let i;
        console.log("Request body:", req.body); // Debugging line to check incoming data
        if(req.body.Premium === "on")
        {
            i=1;
        }
        const updatedPost = {
            PostID: req.body.PostID,
            PostTitle: req.body.PostTitle,
            CID: req.body.CID,
            SCID: req.body.SCID || null,
            UID: req.session.authUser.UserID, // Retrieve UID from session
            TimePost: req.body.TimePost,
            SumContent: req.body.SumContent,
            Content: req.body.Content, // Ensure this field is properly received
            source: req.body.source,
            linksource: req.body.linksource,
            view: req.body.view,
            StatusPost: 'Chờ duyệt',
            Reason: req.body.Reason || null,
            TimePublic: req.body.TimePublic || null,
            Premium: i || 0,
        };
        console.log(req.body.Tags);
        if(req.body.Tags)
        {   
            await tagService.deleteTagsByPostID(req.body.PostID);
            const tags = Array.isArray(req.body.Tags) ? req.body.Tags : req.body.Tags.split(',');
        

            for (const tagID of tags) {
                await tagService.insertTagsToPost(req.body.PostID, tagID);
            }
        }
        
        await postService.updatePost(updatedPost);

        res.redirect('/writer');
    } catch (error) {
        console.error("Error updating post:", error);
        res.status(500).send("An error occurred while updating the post.");
    }
});

// Route to display the form for editing a post
router.get('/edit/:PostID',  async (req, res) => {
    const { PostID } = req.params;
    const post = await postService.findPostById(PostID);
    const categories = await postService.findAllCategories();
    const subcategories = await postService.findAllSubcategories();
    const tags = await postService.findAllTags();
    const tagsSelected=await tagService.findTagByPostID(PostID);
    

    if (!post) {
        return res.status(404).send('Post not found');
    }

    res.render('vwWriter/editPost', { post, categories, subcategories, tags,tagsSelected,csrfToken: req.csrfToken() });
});


// Delete a post
router.post('/delete',  async (req, res) => {
    const { PostID } = req.body;
    await postService.deletePost(PostID);
    res.redirect('/writer');
});

export default router;
