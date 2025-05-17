import express from 'express';


const router =express.Router();

router.get('/', async function (req, res){
    res.render('vwAdmin/adminPage',{
        csrfToken: req.csrfToken()

    });
});


export default router;