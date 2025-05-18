import express from 'express';
import { engine } from 'express-handlebars';
import hbs_sections from 'express-handlebars-sections';
import moment from 'moment';
import session from 'express-session';
import csurf from 'csurf';
import helmet from 'helmet';
import crypto from 'crypto';
import fs from 'fs';
import https from 'https';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

// determine __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// services
import categoryService from './services/category.service.js';
import postService     from './services/post.service.js';
import tagService      from './services/tag.service.js';

// routes
import postsRouter     from './routes/posts.route.js';
import accountRouter   from './routes/account.route.js';
import adminRouter     from './routes/admin.route.js';
import adminCatRouter  from './routes/admin-categories.route.js';
import adminTagRouter  from './routes/admin-tag.route.js';
import adminSubCatRouter from './routes/admin-subcategories.route.js';
import adminReaderRouter  from './routes/admin-reader.route.js';
import adminWriterRouter  from './routes/admin-writer.route.js';
import adminEditorRouter  from './routes/admin-editor.route.js';
import adminPostRouter    from './routes/admin-post.route.js';
import writerRouter       from './routes/writer.route.js';
import editorRouter       from './routes/editor.route.js';

// auth
import { authAdmin, ensureEditor, ensureWriter } from './middlewares/auth.mdw.js';
import { startPublishingService }               from './middlewares/postTCheck.mdw.js';

const app = express();
const PORT = 3030;

// ─── CSP & Helmet Configuration ───────────────────────────────────
const cspDirectives = {
  defaultSrc: ["'self'"],
  baseUri:    ["'self'"],
  formAction: ["'self'"],
  frameAncestors: ["'self'"],
  scriptSrc: [
    "'self'",
    (req, res) => `'nonce-${res.locals.nonce}'`,
    'https://cdn.jsdelivr.net',
    'https://code.jquery.com',
    'https://cdn.ckeditor.com',
    'https://cdnjs.cloudflare.com'
  ],
  styleSrc: [
    "'self'",
    (req, res) => `'nonce-${res.locals.nonce}'`,
    'https://fonts.googleapis.com',
    'https://cdn.jsdelivr.net',
    'https://cdnjs.cloudflare.com',
    'https://stackpath.bootstrapcdn.com'
  ],
  fontSrc: ["'self'", 'https://fonts.gstatic.com', 'https://cdn.jsdelivr.net'],
  imgSrc: ["'self'"],
  connectSrc: ["'self'"],
  objectSrc: ["'none'"],
  upgradeInsecureRequests: []
};

// nonce middleware (for inline scripts/styles)
app.use((req, res, next) => {
  res.locals.nonce = crypto.randomBytes(16).toString('base64');
  next();
});

// apply Helmet but disable default CSP
app.use(helmet({ contentSecurityPolicy: false }));
app.use(
  helmet.contentSecurityPolicy({
    useDefaults: false,
    directives: cspDirectives
  })
);

// log actual CSP header
app.use((req, res, next) => {
  res.on('finish', () => {
    console.log(res.statusCode, req.method, req.originalUrl, 'CSP→',
      res.getHeader('Content-Security-Policy')
    );
  });
  next();
});

// ─── View Engine ─────────────────────────────────────────────────
app.engine('hbs', engine({
  extname: 'hbs',
  defaultLayout: 'main_layout',
  partialsDir: path.join(__dirname, 'views', 'partials'),
  helpers: {
    section: hbs_sections(),
    Equal: (a, b) => Number(a) === Number(b),
    Include: (a, b) => Array.isArray(b) && b.includes(a),
    Stringcompare: (a, b) => String(a) === String(b),
    Increment: v => v + 1,
    Decrement: v => Math.max(1, v - 1),
    encodeURIComponent: (str) => encodeURIComponent(str),

  }
}));
app.set('view engine', 'hbs');
app.set('views', './views');
app.set('trust proxy', 1);

// ─── Session & CSRF ───────────────────────────────────────────────
app.use(session({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', secure: true }
}));
console.log('session with SameSite=Lax LOADED from', __filename);

app.use(express.urlencoded({ extended: true }));
app.use(csurf());
app.use((req, res, next) => {
  res.locals.csrfToken = req.csrfToken();
  next();
});

// ─── Static Files & Common Locals ─────────────────────────────────
app.use('/static', express.static('static'));

// expose the correct base URL to all templates (so assets resolve over HTTPS)
app.use((req, res, next) => {
  const proto = req.secure
    ? 'https'
    : req.headers['x-forwarded-proto']?.split(',')[0] === 'https'
      ? 'https'
      : 'http';
  res.locals.baseUrl = `${proto}://${req.get('host')}`;
  next();
});

app.use(async (req, res, next) => {
  if (!req.session.auth) req.session.auth = false;
  res.locals.auth = req.session.auth;
  res.locals.authUser = req.session.authUser;
  next();
});
app.use(async (req, res, next) => {
  const cats = await categoryService.findAllCategories();
  const categories = await Promise.all(
    cats.map(async c => ({
      CID: c.CID,
      CName: c.CName,
      subCategories: await categoryService.findSubCategoriesByCID(c.CID)
    }))
  );
  res.locals.lcCategories = categories;
  res.locals.lcIsCenter = false;
  res.locals.lcIsAdminPage = false;
  next();
});

// background publishing check
startPublishingService();

// ─── Routes ───────────────────────────────────────────────────────
app.get('/', async function(req, res) {
  // Top 3 posts of last week
  const top3post = await postService.top3PostsLastWeek();
  for (let post of top3post) {
    post.TimePublic = moment(post.TimePublic).format('DD/MM/YYYY HH:mm:ss');
    const tags = await tagService.findTagByPostID(post.PostID);
    post.Tags = tags.map(tag => ({ TagID: tag.TagID, TName: tag.TName }));
  }
  const lastPost = top3post.pop();

  const limit = parseInt(2);
  const nPages = parseInt(5);
  let current_pageMV = parseInt(req.query.pageMV) || 1;
  let current_pageNP = parseInt(req.query.pageNP) || 1;
  let current_pageTC = parseInt(req.query.pageTC) || 1;
  if(current_pageMV > 5){
      current_pageMV = 5;
  }
  if(current_pageNP > 5){
      current_pageNP = 5;
  }
  if(current_pageTC > 5){
      current_pageTC = 5;
  }
  // Most Viewed
  const offsetMV = (current_pageMV - 1) * limit;
  const top10MostView = await postService.top10MostView(limit, offsetMV);
  for (let post of top10MostView) {
    post.TimePublic = moment(post.TimePublic).format('DD/MM/YYYY HH:mm:ss');
    const tags = await tagService.findTagByPostID(post.PostID);
    post.Tags = tags.map(tag => ({ TagID: tag.TagID, TName: tag.TName }));
  }

  // Newest Posts
  const offsetNP = (current_pageNP - 1) * limit;
  const top10NewestPost = await postService.top10NewestPost(limit, offsetNP);
  for (let post of top10NewestPost) {
    post.TimePublic = moment(post.TimePublic).format('DD/MM/YYYY HH:mm:ss');
    const tags = await tagService.findTagByPostID(post.PostID);
    post.Tags = tags.map(tag => ({ TagID: tag.TagID, TName: tag.TName }));
  }

  // Categories by Views
  const offsetTC = (current_pageTC - 1) * limit;
  const top10CategoriesByView = await postService.top10CategoriesByView(limit, offsetTC);
  const newestPostsOfTop10Cat = [];
  for (let cat of top10CategoriesByView) {
    const p = await postService.findNewestPostByCID(cat.CID);
    p.TimePublic = moment(p.TimePublic).format('DD/MM/YYYY HH:mm:ss');
    const tags = await tagService.findTagByPostID(p.PostID);
    p.Tags = tags.map(tag => ({ TagID: tag.TagID, TName: tag.TName }));
    newestPostsOfTop10Cat.push(p);
  }

  // Build pagination arrays
  const pageNumbersMV = Array.from({ length: nPages }, (_, i) => ({ value: i+1, active: i+1 === current_pageMV }));
  const pageNumbersNP = Array.from({ length: nPages }, (_, i) => ({ value: i+1, active: i+1 === current_pageNP }));
  const pageNumbersTC = Array.from({ length: nPages }, (_, i) => ({ value: i+1, active: i+1 === current_pageTC }));

  res.render('home', {
    top2post: top3post,
    lastPost,
    top10MostView,
    top10NewestPost,
    newestPostsOfTop10Cat,
    pageNumbersMV,
    current_pageMV,
    pageNumbersNP,
    current_pageNP,
    pageNumbersTC,
    current_pageTC,
    totalPages: nPages
  });
});

app.use('/posts', postsRouter);
app.use('/account', accountRouter);
app.use('/admin', authAdmin, adminRouter);
app.use('/admin/categories', authAdmin, adminCatRouter);
app.use('/admin/categories/subcategories', authAdmin, adminSubCatRouter);
app.use('/admin/tags', authAdmin, adminTagRouter);
app.use('/admin/reader', authAdmin, adminReaderRouter);
app.use('/admin/writer', authAdmin, adminWriterRouter);
app.use('/admin/editor', authAdmin, adminEditorRouter);
app.use('/admin/post', authAdmin, adminPostRouter);
app.use('/writer', ensureWriter, writerRouter);
app.use('/editor', ensureEditor, editorRouter);
app.use('/403', (req, res) => res.render('403', { layout: false }));
app.use((req, res) => {
  console.log('FINAL 404:', req.originalUrl);
  res.status(404).render('404', { layout: false });
});
app.use((err, req, res, next) => {
  if (err.code === 'EBADCSRFTOKEN') return res.render('403', { layout: false });
  next(err);
});

// ─── HTTPS / HTTP STARTUP ─────────────────────────────────────────
const KEY_PATH  = path.join(__dirname, 'key.pem');
const CERT_PATH = path.join(__dirname, 'cert.pem');

if (fs.existsSync(KEY_PATH) && fs.existsSync(CERT_PATH)) {
  // HTTPS
  const sslOpts = {
    key: fs.readFileSync(KEY_PATH),
    cert: fs.readFileSync(CERT_PATH)
  };
  https.createServer(sslOpts, app)
    .listen(PORT, () => console.log(`HTTPS on https://localhost:${PORT}`));
} else {
  // fallback HTTP
  app.listen(PORT, () => {
    console.warn(' SSL files missing; running HTTP');
    console.log(` HTTP on http://localhost:${PORT}`);
  });
}
