const router=require("express").Router();

const {verifyToken}=require("../middleware/auth");

const {recommend}=require("../controllers/recommendController");

router.use(verifyToken);

router.get("/",recommend);

module.exports=router;