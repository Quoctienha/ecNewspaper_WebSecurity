import express from "express";
import * as editorService from "../services/editor.service.js"; // Import tất cả các hàm từ service
import { ensureEditor } from "../middlewares/auth.mdw.js";
import session from "express-session";
import moment from "moment";
const router = express.Router();

router.use(express.json()); // Middleware to parse JSON

/**
 * Route: Hiển thị danh sách bài viết cần duyệt
 * Method: GET
 */
router.get("/drafts", async (req, res) => {
  try {
    const editorId = req.session.authUser.UserID;

    if (!editorId) {
      return res.status(401).send("Unauthorized access. Editor ID missing.");
    }

    const drafts = await editorService.getDraftPostsByEditor(editorId);
    const drafts2=await editorService.getAcceptedPostsByEditor(editorId);
    const drafts3=await editorService.getExportedPostsByEditor(editorId);
    const drafts4=await editorService.getDenyPostsByEditor(editorId);
 
    res.render("vwEditor/drafts", {   drafts,
      drafts2,
      drafts3,
      drafts4,
      csrfToken: req.csrfToken()
    });
  } catch (error) {
    console.error("Error fetching draft posts:", error);
    res.status(500).send("An error occurred while fetching drafts.");
  }
  
});

/**
 * Route: Duyệt bài viết
 * Method: POST
 */
router.post("/approve", async (req, res) => {
  try {
    const { PostID ,TimePublic} = req.body; // Correctly extract PostID from req.body
    console.log("PostID received:", PostID); // Log the received PostID
    const TimePublic2=moment(TimePublic, 'DD/MM/YYYY HH/mm/ss').format('YYYY-MM-DD HH/mm/ss');
    if (!PostID) {
      return res.status(400).send("Thiếu thông tin để duyệt bài viết."); // Missing PostID
    }

    await editorService.approvePost(PostID,TimePublic2);
    res.json({ message: "Bài viết đã được duyệt." });
  } catch (error) {
    console.error("Error approving post:", error);
    res.status(500).send("Lỗi khi duyệt bài viết.");
  }
});



/**
 * Route: Từ chối bài viết
 * Method: POST
 */
router.post("/reject", async (req, res) => {
  try {
    const { PostID ,reason } = req.body; // Correctly extract PostID from req.body
    console.log("PostID received:", PostID); // Log the received PostID
    if (!PostID) {
      return res.status(400).send("Thiếu thông tin để duyệt bài viết."); // Missing PostID
    }

    await editorService.rejectPost(PostID,reason);
    res.json({ message: "Bài viết đã được từ chối" });
  } catch (error) {
    console.error("Error approving post:", error);
    res.status(500).send("Lỗi khi từ chối bài viết.");
  }
});

export default router;