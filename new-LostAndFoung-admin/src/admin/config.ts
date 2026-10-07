// 当前服务器已经确认存在的接口，打开对应页面就能直接使用。
// 只有后端还没有提供的能力才保持 false。
export const backendSupport = {
  // GET /api/v1/announcements
  // POST /api/v1/admin/announcements
  // DELETE /api/v1/admin/announcements/:id
  adminAnnouncements: true,

  // 公告创建和编辑接口暂时不支持 multipart/form-data 的可选 image 文件。
  announcementImages: false,

  // GET /api/v1/admin/count
  statistics: true,
}
