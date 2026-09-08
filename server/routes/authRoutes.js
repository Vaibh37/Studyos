const express =
  require("express");

const firebaseAuth =
  require(
    "../middleware/firebaseAuth"
  );

const router =
  express.Router();

// =========================================
// CURRENT AUTHENTICATED USER
// =========================================

router.get(
  "/me",
  firebaseAuth,
  (req, res) => {
    res.json({
      user:
        req.user,
    });
  }
);

module.exports =
  router;