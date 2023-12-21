var async = require('async');
var moment = require('moment');
const {body, validationResult} = require('express-validator');

var Table = require('../models/table');
var Tableinstance = require('../models/tableinstance');


exports.index = function(req, res) {
    async.parallel({
        tables_count: function(callback) {
            Table.countDocuments({}, callback);
        },
        // еще некоторые запросы информации для отображения на стартовой
    }, function(err, results) {
        res.render('index', {
            title: 'ღШафранღ',
            data: results,
            error: err
        });
    });
};


exports.table_list = function(req, res, next) {

    Table.find({}, 'tab_name chairs description')
      .populate('tab_name')
      .exec(function (err, list_tables) {
        if (err) { return next(err); }
        //Successful, so render
        list_tables.sort(function(a, b) {
            let textA = a.tab_name.toUpperCase(); 
            let textB = b.tab_name.toUpperCase(); 
            return (textA < textB) ? -1 : (textA > textB) ? 1 : 0;
        });
        res.render('table_list', {
            title: 'Столики',
            table_list: list_tables
        });
      });

};


exports.menu = function(req, res) {
    async.parallel({
        tables_count: function(callback) {
            Table.countDocuments({}, callback);
        },
        // еще некоторые запросы информации для отображения на стартовой
    }, function(err, results) {
        res.render('menu', {
            title: '',
            data: results,
            error: err
        });
    });
}


// Добавление стола
exports.table_create_get = function(req, res, next) {
    res.render('table_form', {
        title: 'Добавить стол'
    });
};
exports.table_create_post = [
        body('tab_name').trim().isLength({min: 1}).escape()
        .withMessage('У стола должен быть номер(название)'),

        body('chairs').trim().isFloat({min: 1, max: 40}).escape()
        .withMessage('У стола может быть от 1 до 40 мест'),

        body('description').escape(),

        (req, res, next) => {
            const errors = validationResult(req);
            if(!errors.isEmpty()) {
                res.render('table_form', {
                    title: 'Добавить стол',
                    table: req.body,
                    errors: errors.array()
                });
                return;
            }
            else {
                var table = new Table(
                    {
                        tab_name: req.body.tab_name,
                        chairs: req.body.chairs,
                        description: req.body.description
                    }
                );

                Table.findOne({ 'tab_name': req.body.tab_name })
                    .exec( function (err, found_table) {
                        if (err) { return next(err); }

                        if (found_table) {
                            res.redirect(found_table.url);
                        }
                        else {
                            table.save(function (err) {
                                if (err) { return next(err); }
                                res.redirect(table.url);
                            });
                        }
                    });
            }
        }
];



// Удаление стола
exports.table_delete_get = function(req, res) {
    async.parallel({
        table: function(callback) {
            Table.findById(req.params.id).exec(callback)
        },
        tableinstance: function(callback) {
          Tableinstance.find({ 'table': req.params.id }).exec(callback)
        },
    }, function(err, results) {
        if (err) { return next(err); }
        if (results.table==null) {
            res.redirect('/hall/tables');
        }
        // Удачно, значит рендерим.
        res.render('table_delete', {
            title: 'Удаление стола',
            table: results.table,
            tableinstances: results.tableinstance
        });
    });

}
exports.table_delete_post = function(req, res) {
    async.parallel({
        table: function(callback) {
          Table.findById(req.body.tableid).exec(callback)
        },
        tableinstances: function(callback) {
          Tableinstance.find({ 'table': req.body.tableid }).exec(callback)
        },
    }, function(err, results) {
        if (err) { return next(err); }

        if (results.tableinstances.length > 0) {
            // Если есть бронирования
            res.render('table_delete', {
                title: 'Удаление стола',
                table: results.table,
                tableinstances: results.tableinstances
            });
            return;
        }
        else {
            // У стола нет бронирований
            Table.findByIdAndRemove(req.body.tableid, function deleteTable(err) {
                if (err) { return next(err); }
                res.redirect('/hall/tables')
            })
        }
    });
}



// Изменение стола
exports.table_update_get = function(req, res) {
    Table.findById(req.params.id, function(err, table) {
        if (err) { return next(err); }
        if (table == null) {
            var err = new Error('Стол не найден');
            err.status = 404;
            return next(err);
        }
        res.render('table_form', {
            title: 'Изменить стол',
            table: table
        });
    })
}
exports.table_update_post = [
    body('tab_name').trim().isLength({min: 1}).escape()
    .withMessage('У стола должен быть номер(название)'),

    body('chairs').trim().isFloat({min: 1, max: 40}).escape()
    .withMessage('У стола может быть от 1 до 40 мест'),

    body('description').escape(),

    (req, res, next) => {
        const errors = validationResult(req);

        var table = new Table(
            {
                tab_name: req.body.tab_name,
                chairs: req.body.chairs,
                description: req.body.description,
                _id: req.params.id
            }
        );

        if(!errors.isEmpty()) {
            res.render('table_form', {
                title: 'Изменить стол',
                table: req.body,
                errors: errors.array()});
            return;
        }
        else {
            Table.findByIdAndUpdate(req.params.id, table, {}, function(err, the_table) {
                if (err) { return next(err); }
                res.redirect(the_table.url);
            })
        }
    }
];



// Детализация стола
exports.table_detail_get = function(req, res) {
    var today = new Date();
    var today_formatted = moment(today).format('yyyy-MM-DD')

    async.parallel({
        table: function(callback) {
            Table.findById(req.params.id).exec(callback)
        },
    }, function(err, results) {
        if (err) { return next(err); }

        if(results.table == null) {
            var err = new Error('Table not found');
            err.status = 404;
            return next(err);
        }
        res.render('table_detail', {
            title: "Заголовок описания стола",
            table: results.table,
            date: today_formatted
        });
    });
};

exports.table_detail_post = function (req, res, next) {
    // для отображения стола со списком бронирований на указанную дату
    var today = new Date(req.body.date);
    var today_calendar = moment(today).format('yyyy-MM-DD')
    var today_formatted = moment(today).format('DD.MM.YYYY')


    async.parallel({
        table: function(callback) {
            Table.findById(req.params.id).exec(callback)
        },
        tableinstance: function(callback) {
            Tableinstance.find({ 'table': req.params.id, 'date': today}).exec(callback)
        },
    }, function(err, results) {
        if (err) { return next(err); }
        if(results.table == null) {
            var err = new Error('Table not found');
            err.status = 404;
            return next(err);
        }
        results.tableinstance.sort(function(a, b) {
            let dateA = a.time_start; 
            let dateB = b.time_start; 
            return (dateA < dateB) ? -1 : (dateA > dateB) ? 1 : 0;
        });
        res.render('table_detail', {
            title: "Заголовок описания стола",
            table: results.table,
            tableinstances: results.tableinstance,
            date: today_calendar,
            date_form: today_formatted});
    });
}
