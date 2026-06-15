const express = require("express");
const router = express.Router();

const buildingChangeRequestController = require("../controllers/buildingChangeRequest.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const {
    adminMiddleware,
    requireRoles,
} = require("../middlewares/role.middleware");
const { ROLES } = require("../utils/constants");

/**
 * @swagger
 * tags:
 *   name: Building Change Requests
 *   description: User requests to change building and admin approval APIs
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     BuildingChangeRequestCreateRequest:
 *       type: object
 *       required:
 *         - requestedBuildingId
 *       properties:
 *         requestedBuildingId:
 *           type: integer
 *           example: 2
 *           description: ID của tòa nhà user muốn chuyển sang
 *         reason:
 *           type: string
 *           example: "Tôi đã chuyển căn hộ sang tòa nhà mới"
 *
 *     BuildingChangeRequestAdminNoteRequest:
 *       type: object
 *       properties:
 *         adminNote:
 *           type: string
 *           example: "Đã kiểm tra thông tin và duyệt yêu cầu"
 *
 *     BuildingChangeRequest:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         userId:
 *           type: integer
 *           example: 5
 *         userName:
 *           type: string
 *           example: "Nguyễn Văn A"
 *         userEmail:
 *           type: string
 *           example: "user@example.com"
 *         userPhone:
 *           type: string
 *           example: "0901234567"
 *         currentBuildingId:
 *           type: integer
 *           nullable: true
 *           example: 1
 *         currentBuildingName:
 *           type: string
 *           nullable: true
 *           example: "FPT Parking Building"
 *         requestedBuildingId:
 *           type: integer
 *           example: 2
 *         requestedBuildingName:
 *           type: string
 *           example: "Sunrise Residence Parking"
 *         requestedBuildingAddress:
 *           type: string
 *           example: "Quận 7, TP.HCM"
 *         reason:
 *           type: string
 *           nullable: true
 *           example: "Tôi đã chuyển căn hộ sang tòa nhà mới"
 *         status:
 *           type: string
 *           enum: [PENDING, APPROVED, REJECTED, CANCELLED]
 *           example: "PENDING"
 *         adminId:
 *           type: integer
 *           nullable: true
 *           example: 1
 *         adminName:
 *           type: string
 *           nullable: true
 *           example: "Admin Test"
 *         adminNote:
 *           type: string
 *           nullable: true
 *           example: "Đã duyệt yêu cầu"
 *         resolvedAt:
 *           type: string
 *           nullable: true
 *           example: "2026-06-15T10:30:00.000Z"
 *         createdAt:
 *           type: string
 *           example: "2026-06-15T09:00:00.000Z"
 *         updatedAt:
 *           type: string
 *           example: "2026-06-15T09:00:00.000Z"
 */

/**
 * @swagger
 * /api/building-change-requests:
 *   post:
 *     summary: User sends a request to change building
 *     tags: [Building Change Requests]
 *     security:
 *       - bearerAuth: []
 *     description: User gửi yêu cầu đổi sang tòa nhà khác. User chỉ được có một yêu cầu PENDING tại một thời điểm.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BuildingChangeRequestCreateRequest'
 *     responses:
 *       201:
 *         description: Gửi yêu cầu đổi tòa nhà thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Gui yeu cau doi toa nha thanh cong"
 *                 data:
 *                   $ref: '#/components/schemas/BuildingChangeRequest'
 *       400:
 *         description: requestedBuildingId không hợp lệ, user đang ở tòa nhà đó, hoặc đã có request PENDING
 *       401:
 *         description: Chưa đăng nhập hoặc token không hợp lệ
 *       403:
 *         description: Chỉ USER được gửi yêu cầu
 *       404:
 *         description: Không tìm thấy tòa nhà muốn chuyển đến
 */
router.post(
    "/",
    authMiddleware,
    requireRoles(ROLES.USER),
    buildingChangeRequestController.createMyBuildingChangeRequest
);

/**
 * @swagger
 * /api/building-change-requests/my:
 *   get:
 *     summary: User gets my building change requests
 *     tags: [Building Change Requests]
 *     security:
 *       - bearerAuth: []
 *     description: User xem lịch sử các yêu cầu đổi tòa nhà của chính mình.
 *     responses:
 *       200:
 *         description: Lấy danh sách yêu cầu của tôi thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Lay danh sach yeu cau cua toi thanh cong"
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/BuildingChangeRequest'
 *       401:
 *         description: Chưa đăng nhập hoặc token không hợp lệ
 *       403:
 *         description: Chỉ USER được xem danh sách yêu cầu của mình
 */
router.get(
    "/my",
    authMiddleware,
    requireRoles(ROLES.USER),
    buildingChangeRequestController.getMyBuildingChangeRequests
);

/**
 * @swagger
 * /api/building-change-requests:
 *   get:
 *     summary: Admin gets building change requests
 *     tags: [Building Change Requests]
 *     security:
 *       - bearerAuth: []
 *     description: Admin xem danh sách yêu cầu đổi tòa nhà, có thể lọc theo status hoặc userId.
 *     parameters:
 *       - in: query
 *         name: status
 *         required: false
 *         schema:
 *           type: string
 *           enum: [PENDING, APPROVED, REJECTED, CANCELLED]
 *         example: PENDING
 *       - in: query
 *         name: userId
 *         required: false
 *         schema:
 *           type: integer
 *         example: 5
 *     responses:
 *       200:
 *         description: Lấy danh sách yêu cầu đổi tòa nhà thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Lay danh sach yeu cau doi toa nha thanh cong"
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/BuildingChangeRequest'
 *       400:
 *         description: status hoặc userId không hợp lệ
 *       401:
 *         description: Chưa đăng nhập hoặc token không hợp lệ
 *       403:
 *         description: Chỉ ADMIN được xem toàn bộ yêu cầu
 */
router.get(
    "/",
    authMiddleware,
    adminMiddleware,
    buildingChangeRequestController.getBuildingChangeRequests
);

/**
 * @swagger
 * /api/building-change-requests/{id}/approve:
 *   patch:
 *     summary: Admin approves a building change request
 *     tags: [Building Change Requests]
 *     security:
 *       - bearerAuth: []
 *     description: Admin duyệt yêu cầu. Backend sẽ đổi users.building_id và đồng bộ vehicles.building_id của user đó.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *         description: ID của yêu cầu đổi tòa nhà
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BuildingChangeRequestAdminNoteRequest'
 *     responses:
 *       200:
 *         description: Duyệt yêu cầu đổi tòa nhà thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Duyet yeu cau doi toa nha thanh cong"
 *                 data:
 *                   $ref: '#/components/schemas/BuildingChangeRequest'
 *       400:
 *         description: Request id không hợp lệ hoặc request không còn PENDING
 *       401:
 *         description: Chưa đăng nhập hoặc token không hợp lệ
 *       403:
 *         description: Chỉ ADMIN được duyệt yêu cầu
 *       404:
 *         description: Không tìm thấy yêu cầu
 */
router.patch(
    "/:id/approve",
    authMiddleware,
    adminMiddleware,
    buildingChangeRequestController.approveBuildingChangeRequest
);

/**
 * @swagger
 * /api/building-change-requests/{id}/reject:
 *   patch:
 *     summary: Admin rejects a building change request
 *     tags: [Building Change Requests]
 *     security:
 *       - bearerAuth: []
 *     description: Admin từ chối yêu cầu đổi tòa nhà.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *         description: ID của yêu cầu đổi tòa nhà
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BuildingChangeRequestAdminNoteRequest'
 *     responses:
 *       200:
 *         description: Từ chối yêu cầu đổi tòa nhà thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Tu choi yeu cau doi toa nha thanh cong"
 *                 data:
 *                   $ref: '#/components/schemas/BuildingChangeRequest'
 *       400:
 *         description: Request id không hợp lệ hoặc request không còn PENDING
 *       401:
 *         description: Chưa đăng nhập hoặc token không hợp lệ
 *       403:
 *         description: Chỉ ADMIN được từ chối yêu cầu
 *       404:
 *         description: Không tìm thấy yêu cầu
 */
router.patch(
    "/:id/reject",
    authMiddleware,
    adminMiddleware,
    buildingChangeRequestController.rejectBuildingChangeRequest
);

module.exports = router;