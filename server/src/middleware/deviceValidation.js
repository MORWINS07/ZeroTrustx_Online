const { body } = require("express-validator");

const registerDeviceValidation = [
    body("deviceIdentifier")
        .trim()
        .notEmpty()
        .withMessage("Device identifier is required")
        .isLength({ min: 3, max: 100 })
        .withMessage("Device identifier must be between 3 and 100 characters"),

    body("name")
        .trim()
        .notEmpty()
        .withMessage("Device name is required")
        .isLength({ min: 2, max: 100 })
        .withMessage("Device name must be between 2 and 100 characters"),

    body("type")
        .isIn(["DESKTOP", "LAPTOP", "MOBILE", "TABLET", "OTHER"])
        .withMessage("Invalid device type")
];

module.exports = {
    registerDeviceValidation
};