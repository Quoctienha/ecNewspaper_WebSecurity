import db from "../utils/db.js";
import express from "express";
const router = express.router;
/**
 * Lấy danh sách bài viết draft do biên tập viên quản lý.
 *
 * @param {number} editorId - ID của biên tập viên.
 * @returns {Promise<Array>} - Danh sách bài viết draft.
 */


export const checkAndPublishPosts = async () => {
  try {
    const now = new Date();

    // Update posts that are ready for publishing
    const updatedRows = await db("posts")
      .where("TimePublic", "<=", now)
      .where("StatusPost", "Chờ xuất bản") // Avoid already published posts
      .update({
        StatusPost: "Đã xuất bản",
      });

    if (updatedRows > 0) {
      console.log(`${updatedRows} posts updated to "Đã xuất bản".`);
    }
  } catch (error) {
    console.error("Error checking and publishing posts:", error);
  }
};

/**
 * Start a periodic task to check and update posts.
 */
export const startPublishingService = () => {
  setInterval(async () => {
    await checkAndPublishPosts();
  }, 1000); // Check every 60 seconds (adjust as needed)
};