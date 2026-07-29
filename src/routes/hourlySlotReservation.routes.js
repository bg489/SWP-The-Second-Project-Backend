const express = require("express");
const router = express.Router();

const hourlySlotReservationController = require("../controllers/hourlySlotReservation.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const { requireRoles } = require("../middlewares/role.middleware");
const { AUTHENTICATED_ROLES, ROLES } = require("../constants/roles");

router.get(
    "/availability",
    authMiddleware,
    requireRoles(...AUTHENTICATED_ROLES),
    hourlySlotReservationController.getAvailability
);

router.get(
    "/check-in-match",
    authMiddleware,
    requireRoles(ROLES.STAFF, ROLES.MANAGER, ROLES.ADMIN),
    hourlySlotReservationController.getCheckInMatch
);

router.get(
    "/my",
    authMiddleware,
    requireRoles(ROLES.USER),
    hourlySlotReservationController.getMyReservations
);

router.post(
    "/my",
    authMiddleware,
    requireRoles(ROLES.USER),
    hourlySlotReservationController.createUserReservation
);

router.get(
    "/staff",
    authMiddleware,
    requireRoles(ROLES.STAFF, ROLES.MANAGER, ROLES.ADMIN),
    hourlySlotReservationController.getStaffReservations
);

router.post(
    "/staff",
    authMiddleware,
    requireRoles(ROLES.STAFF, ROLES.MANAGER, ROLES.ADMIN),
    hourlySlotReservationController.createGuestReservation
);

module.exports = router;
