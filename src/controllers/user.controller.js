const authController = require("./auth.controller");

module.exports = {
    getCurrentUser: authController.getCurrentUser,
};
