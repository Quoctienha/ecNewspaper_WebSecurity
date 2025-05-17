import express from 'express';
import { engine } from 'express-handlebars';
import hbs_sections from 'express-handlebars-sections';
import moment from 'moment';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import csurf from 'csurf';

//service
import categoryService from './services/category.service.js';
import postService from './services/post.service.js';
import tagService from './services/tag.service.js';

//route
import postsRouter from './routes/posts.route.js';
import accountRouter from './routes/account.route.js';
import adminRouter from './routes/admin.route.js';
import adminCatRouter from './routes/admin-categories.route.js';
import adminTagRouter from './routes/admin-tag.route.js';
import adminSubCatRouter from './routes/admin-subcategories.route.js';
import adminReaderRouter from './routes/admin-reader.route.js';
import adminWriterRouter from './routes/admin-writer.route.js'
import adminEditorRouter from './routes/admin-editor.route.js';
import adminPostRouter from './routes/admin-post.route.js';
import writerRouter from "./routes/writer.route.js";
import editorRouter from "./routes/editor.route.js";
//auth
import { authAdmin } from './middlewares/auth.mdw.js';
import { startPublishingService } from "./middlewares/postTCheck.mdw.js";
import { ensureEditor } from './middlewares/auth.mdw.js';
import { ensureWriter } from './middlewares/auth.mdw.js';



//Xác định thư mục hiện tại của tệp
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const app = express()
const port = 3030

app.engine('hbs', engine({
  extname: 'hbs',
  defaultLayout: 'main_layout',
  partialsDir: path.join(__dirname, 'views', 'partials'),
  helpers: {
    section: hbs_sections(),

    Equal(a, b){
      return Number(a) === Number(b);
    },
    Include(a,b)
    { if (Array.isArray(b) && b.includes(a)) {
      return true;
    }
      return false;
    },
    Stringcompare(a,b){
      return String(a)=== String(b);
    },

    Increment(value){
      return value +1;
    },

    Decrement(value){
      return Math.max(1, value - 1);
    },

  }
}));
app.set('view engine', 'hbs');
app.set('views', './views');
app.set('trust proxy', 1); // trust first proxy

// Cookie parser để đọc cookie (dùng cho csurf)
//app.use(cookieParser());
app.use(session({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: true,
  //cookie: { secure: false } // true nếu dùng HTTPS
}));


// Middleware xử lý dữ liệu từ form (x-www-form-urlencoded)
app.use(express.urlencoded({ extended: true }));

app.use(csurf()); 
// middleware truyền token ra locals
app.use((req, res, next) => {
  res.locals.csrfToken = req.csrfToken();
  next();
});

//khai báo các đường dẫn cho tập tin tĩnh
//http://localhost:3030/static/imgs/1.jpg
app.use('/static', express.static('static'));

app.use(async function (req, res, next) {
  if (!req.session.auth) {
    req.session.auth = false;
  }

  res.locals.auth = req.session.auth;
  res.locals.authUser = req.session.authUser;
  next();
});

//middleware
app.use( async function(req,res,next){
  const categorieslV1 = await categoryService.findAllCategories();
  const categories =[];

  for(let i = 0; i < categorieslV1.length; i++){
    categories.push({
      CID: categorieslV1[i].CID,
      CName: categorieslV1[i].CName,
      subCategories: await categoryService.findSubCategoriesByCID(categorieslV1[i].CID)
    });
  
   
  }
  
  res.locals.lcCategories = categories;
  res.locals.lcIsCenter = false;
  res.locals.lcIsAdminPage =false;

  next();
});
//Check duyệt bài viết theo thời gian thật
startPublishingService();
//route
app.get('/', async function(req, res) {
  //top 3 posts of last week
  const top3post = await postService.top3PostsLastWeek();
  // Duyệt qua từng bài viết và thêm tag vào mỗi bài viết
for (let post of top3post) {
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

  const lastPost = top3post.pop();

  const limit = parseInt(2);
  const nPages = parseInt(5);
  //current pages
  const current_pageMV =  (parseInt(req.query.pageMV) || 1);// top 10 Most Views
  const current_pageNP =  (parseInt(req.query.pageNP) || 1);// top 10 Newest Posts
  const current_pageTC = (parseInt(req.query.pageTC) || 1); // top 10 Categories By Views
  
  //offset
  const offsetMV = (current_pageMV - 1) * limit;  // top 10 Most Views
  const offsetNP =(current_pageNP - 1) * limit;  // top 10 Newest Posts
  const offsetTC =(current_pageTC - 1) * limit; // top 10 Categories By Views

  const top10MostView = await postService.top10MostView(limit, offsetMV);
  for (let post of top10MostView) {
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

  const top10NewestPost = await postService.top10NewestPost(limit, offsetNP);
  for (let post of top10NewestPost) {
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

  const top10CategoriesByView = await postService.top10CategoriesByView(limit, offsetTC);
  const newestPostsOfTop10Cat = [];
  for(let i=0; i<top10CategoriesByView.length;i++){
    newestPostsOfTop10Cat.push(await postService.findNewestPostByCID(top10CategoriesByView[i].CID));
  }
  for (let post of newestPostsOfTop10Cat) {
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

  //page numbers
  const pageNumbersMV = [];
  for (let i = 0; i < nPages; i++) {
    pageNumbersMV.push({
      value: i + 1,
      active: (i + 1) === +current_pageMV,
      
    });
  }

  const pageNumbersNP = [];
  for (let i = 0; i < nPages; i++) {
    pageNumbersNP.push({
      value: i + 1,
      active: (i + 1) === +current_pageNP,
      
    });
  }

  const pageNumbersTC = [];
  for (let i = 0; i < nPages; i++) {
    pageNumbersTC.push({
      value: i + 1,
      active: (i + 1) === +current_pageTC,
      
    });
  }

  res.render('home',{
    top2post: top3post,
    lastPost: lastPost,
    top10MostView: top10MostView,
    top10NewestPost: top10NewestPost,
    newestPostsOfTop10Cat: newestPostsOfTop10Cat,

    pageNumbersMV: pageNumbersMV,
    current_pageMV: current_pageMV,

    pageNumbersNP: pageNumbersNP,
    current_pageNP: current_pageNP,

    pageNumbersTC: pageNumbersTC,
    current_pageTC: current_pageTC,
    
    totalPages: nPages
  });
  //console.log(top10CategoriesByView);
  //console.log(newestPostsOfTop10Cat);
})
 
app.use('/posts', postsRouter);
app.use('/account', accountRouter);
//admin
app.use('/admin',authAdmin, adminRouter);
app.use('/admin/categories',authAdmin, adminCatRouter);
app.use('/admin/categories/subcategories',authAdmin,adminSubCatRouter);
app.use('/admin/tags',authAdmin, adminTagRouter);
app.use('/admin/reader',authAdmin, adminReaderRouter);
app.use('/admin/writer',authAdmin, adminWriterRouter);
app.use('/admin/editor',authAdmin, adminEditorRouter);
app.use('/admin/post', authAdmin, adminPostRouter);
//writer
app.use("/writer",ensureWriter, writerRouter);
//editor
app.use("/editor",ensureEditor, editorRouter);

app.use('/403',function (req, res, next) {
  res.render('403', { layout: false });
});

app.use('/404',function (req, res, next) {
  res.render('404', { layout: false });
});

app.use((err, req, res, next) => {
  if (err.code === 'EBADCSRFTOKEN') {
    // token không hợp lệ
    return res.render('403', { layout: false});
  }
  next(err);
});
app.listen(port, function() {
  console.log(`ecNewsPaper app listening at http://localhost:${port}`)
});




