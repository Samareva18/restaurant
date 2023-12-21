var express = require('express');
var router = express.Router();


// Требующиеся модули контроллеров

var table_controller = require('../controllers/tableController');
var tableinstance_controller = require('../controllers/tableinstanceController');


// Маршруты столов

router.get('/', table_controller.index);

router.get('/table/create', table_controller.table_create_get);
router.post('/table/create', table_controller.table_create_post);

router.get('/table/:id/delete', table_controller.table_delete_get);
router.post('/table/:id/delete', table_controller.table_delete_post);

router.get('/table/:id/update', table_controller.table_update_get);
router.post('/table/:id/update', table_controller.table_update_post);

router.get('/table/:id', table_controller.table_detail_get);
router.post('/table/:id', table_controller.table_detail_post);

router.get('/tables', table_controller.table_list);

router.get('/menu', table_controller.menu);




// Марштуры бронирований
router.get('/tableinstance/create', tableinstance_controller.tableinstance_create_get);
router.post('/tableinstance/create', tableinstance_controller.tableinstance_create_post);

router.get('/tableinstance/:id/delete', tableinstance_controller.tableinstance_delete_get);
router.post('/tableinstance/:id/delete', tableinstance_controller.tableinstance_delete_post);

router.get('/tableinstance/:id/update', tableinstance_controller.tableinstance_update_get);
router.post('/tableinstance/:id/update', tableinstance_controller.tableinstance_update_post);

router.get('/tableinstance/:id', tableinstance_controller.tableinstance_detail);

router.get('/tableinstances', tableinstance_controller.tableinstance_list);

// Получить информацию о бронировании по id
router.get('/getinstances', tableinstance_controller.getinstances_get);
router.post('/getinstances', tableinstance_controller.getinstances_post);


module.exports = router;