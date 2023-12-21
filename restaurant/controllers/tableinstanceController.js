var async = require('async');
const {body, validationResult, validator} = require('express-validator');
const { DateTime } = require("luxon");
var moment = require('moment');

var Table = require('../models/table');
var Tableinstance = require('../models/tableinstance');



exports.tableinstance_list = function(req, res, next) {
    Tableinstance.find({}, 'table user date time_start time_end')
      .populate('table')
      .exec(function (err, instances) {
        if (err) { return next(err); }
        instances.sort(function(a, b) {
            let dateA = a.date; 
            let dateB = b.date; 
            return (dateA < dateB) ? -1 : (dateA > dateB) ? 1 : 0;
        });
        res.render('tableinstances_list', { title: 'Бронирования', instances_list: instances });
      });

};


// Добавление бронирования
exports.tableinstance_create_get = function(req, res, next) {
    async.parallel({
        tables: function(callback) {
            Table.find(callback);
        },
    }, function(err, results) {
        if (err) { return next(err); }
        results.tables.sort(function(a, b) {
            let textA = a.tab_name.toUpperCase(); 
            let textB = b.tab_name.toUpperCase(); 
            return (textA < textB) ? -1 : (textA > textB) ? 1 : 0;
        });
        res.render('tableinstance_form', {
            title: 'Забронировать стол',
            tables: results.tables
        });
    });
};

exports.tableinstance_create_post = [
        body('user').trim().isLength({min: 2}).escape().withMessage("Задайте имя пользователя (от 2 букв)")
            .matches(/^[А-Яа-яA-Za-z\s]+$/),

        body('phone_number').trim().isLength({min: 7, max: 15}).escape().withMessage("Номер телефона должен быть из 7-15 чисел"),

        body('date', 'Invalid date').optional({ checkFalsy: true}).isISO8601().toDate(),
        body('time_start', 'Invalid time start').trim().isLength({min: 5, max: 5}),
        body('time_end', 'Invalid time end').trim().isLength({min: 5, max: 5}),
        body('reserv_description', 'Поле описания ограничено 200 символами').trim().isLength({max: 200})
            .custom((val, {req}) => {
                var time_start = new Date(req.body.date)
                time_start.setHours(req.body.time_start.slice(0,2))
                time_start.setMinutes(req.body.time_start.slice(3))

                var time_end = new Date(req.body.date)
                time_end.setHours(req.body.time_end.slice(0,2))
                time_end.setMinutes(req.body.time_end.slice(3))

                if (time_start > time_end) {
                    throw new Error('Время начала бронирования должно быть раньше окончания.')
                };
                return true;
                })
            .custom((val, {req}) => {
                    var time_start = new Date(req.body.date)
                    time_start.setHours(req.body.time_start.slice(0,2))
                    time_start.setMinutes(req.body.time_start.slice(3))

                    var time_end = new Date(req.body.date)
                    time_end.setHours(req.body.time_end.slice(0,2))
                    time_end.setMinutes(req.body.time_end.slice(3))

                    // Проверка на время работы ресторана
                    var time_open = new Date(req.body.date)
                    time_open.setHours(11, 0)

                    if (time_start < time_open) {
                        throw new Error('Ресторан открывается в 11:00')
                    }
                    return true;
                    }),
        body('reserv_description').trim().escape(),

        (req, res, next) => {
            var time_start = new Date(req.body.date)
            time_start.setHours(req.body.time_start.slice(0, 2))
            time_start.setMinutes(req.body.time_start.slice(3))

            var time_end = new Date(req.body.date)
            time_end.setHours(req.body.time_end.slice(0, 2))
            time_end.setMinutes(req.body.time_end.slice(3))

            const errors = validationResult(req);

            // собираем заготовку брони
            var tableinstance = new Tableinstance({
                table: req.body.table,
                user: req.body.user,
                phone_number: req.body.phone_number,
                date: req.body.date,
                time_start: time_start,
                time_end: time_end,
                reserv_description: req.body.reserv_description
            })

            // Если есть ошибки
            if(!errors.isEmpty()) {
                Table.find({})
                    .exec(function(err, tables) {
                        if (err) { return next(err); }
                        res.render('tableinstance_form', {
                            title: 'Забронировать стол',
                            tables: tables,
                            tableinstance: tableinstance,
                            errors: errors.array()
                        });
                    })

                return;
            }
            // проверить что нет пересечений с существующими периодами
            else {
                async.parallel({
                    tables: function(callback) {
                        Table.find(callback);
                    },
                    tableinstances: function(callback){
                        Tableinstance.find({'table': req.body.table, 'date':req.body.date}, 'table date time_start time_end')
                        .exec(callback)
                    }
                }, function (err, results){
                        if (err) { return next(err); }
                        // Ищем бронирования на ту же дату и проверяем время
                        var was_collision = false
                        var collision_inst = [];

                        if (results.tableinstances.length) {
                            results.tableinstances.forEach(inst => {
                                var inst_start = inst.time_start
                                var inst_end = inst.time_end

                                if(!(time_end <= inst_start || time_start >= inst_end))
                                {
                                    was_collision = true;
                                    collision_inst.push(inst);
                                }
                            });
                            // Брони проверены, коллизий не обнаружено
                            if (!was_collision) {
                                tableinstance.save(function (err) {
                                    if (err) { return next(err); }
                                    res.redirect(tableinstance.url);
                                })
                            }
                            else {
                                res.render('tableinstance_form', {
                                        title: 'Забронировать стол',
                                        tables: results.tables,
                                        tableinstance: tableinstance,
                                        custom_err: 'Выбранное время пересекает другой период',
                                        instances_err: collision_inst,
                                    });
                            }
                        }
                        else {
                            tableinstance.save(function (err) {
                                if (err) { return next(err); }
                                res.redirect(tableinstance.url);
                            })
                        }
                    });
            }
        }
];

// Удаление бронирования
exports.tableinstance_delete_get = function(req, res) {
    async.parallel({
        tableinstance: function(callback) {
          Tableinstance.findById(req.params.id).populate('table').exec(callback)
        },
    }, function(err, results) {
        if (err) { return next(err); }
        if (results.tableinstance==null) {
            res.redirect('/hall/tables');
        }
        // Удачно, значит рендерим.
        res.render('tableinstance_delete', {
            title: 'Удаление бронирования',
            tableinstance: results.tableinstance
        });
    });

}
exports.tableinstance_delete_post = function(req, res) {
    async.parallel({
        // tableinstances: function(callback) {
        //   Tableinstance.findById(req.params.id).exec(callback)
        // },
    }, function(err) {
        if (err) { return next(err); }

        Tableinstance.findByIdAndRemove(req.body.tableinstanceid, function deleteTable(err) {
            if (err) { return next(err); }
            res.redirect('/hall/tables')
        })

    });
}

// Изменение бронирования
exports.tableinstance_update_get = function(req, res, next) {
    async.parallel({
        tableinstance: function(callback){
            Tableinstance.findById(req.params.id).populate('table').exec(callback);
        },

        tables: function(callback) {
            Table.find({}, 'tab_name chairs').exec(callback);
        }

    }, function(err, result) {
        if (err) { return next(err); }
        if (result.tableinstance == null) {
            var err = new Error('Бронирование не найдено');
            err.status = 404;
            return next(err);
        }

        var dd = moment(result.tableinstance.date).format('yyyy-MM-DD')
        var ts = moment(result.tableinstance.time_start).format('HH:mm')
        var te = moment(result.tableinstance.time_end).format('HH:mm')

        res.render('tableinstance_form', {
            title: 'Изменить бронирование стола',
            tableinstance: result.tableinstance,
            tables: result.tables,
            time_start: ts,
            time_end: te,
            date: dd
        });
    })
}
exports.tableinstance_update_post = [
    body('user').trim().isLength({min: 2}).escape().withMessage("Задайте имя пользователя (от 2 букв)")
        .matches(/^[А-Яа-яA-Za-z\s]+$/),

    // TODO: добавить проверку что в номере телефона нет лишних символов
    body('phone_number').trim().isLength({min: 7, max: 15}).escape().withMessage("Номер телефона должен быть из 7-15 чисел"),

    body('date', 'Invalid date').optional({ checkFalsy: true}).isISO8601().toDate(),
    body('time_start', 'Invalid time start').trim().isLength({min: 5, max: 5}),
    body('time_end', 'Invalid time end').trim().isLength({min: 5, max: 5})
        .custom((val, {req}) => {
            var time_start = new Date(req.body.date)
            time_start.setHours(req.body.time_start.slice(0,2))
            time_start.setMinutes(req.body.time_start.slice(3))

            var time_end = new Date(req.body.date)
            time_end.setHours(req.body.time_end.slice(0,2))
            time_end.setMinutes(req.body.time_end.slice(3))

            if (time_start > time_end) {
                throw new Error('Время начала бронирования должно быть раньше окончания.')
            };
            return true;
            })
        .custom((val, {req}) => {
                var time_start = new Date(req.body.date)
                time_start.setHours(req.body.time_start.slice(0,2))
                time_start.setMinutes(req.body.time_start.slice(3))

                var time_end = new Date(req.body.date)
                time_end.setHours(req.body.time_end.slice(0,2))
                time_end.setMinutes(req.body.time_end.slice(3))

                // Проверка на время работы ресторана
                var time_open = new Date(req.body.date)
                time_open.setHours(11, 0)

                if (time_start < time_open) {
                    throw new Error('Ресторан открывается в 11:00')
                }
                return true;
                }),
    body('reserv_description').trim().escape(),

    (req, res, next) => {
        // TODO: валидация периода
        var time_start = new Date(req.body.date)
        time_start.setHours(req.body.time_start.slice(0,2))
        time_start.setMinutes(req.body.time_start.slice(3))

        var time_end = new Date(req.body.date)
        time_end.setHours(req.body.time_end.slice(0,2))
        time_end.setMinutes(req.body.time_end.slice(3))

        const errors = validationResult(req);

        var tableinstance = new Tableinstance({
            table: req.body.table,
            user: req.body.user,
            phone_number: req.body.phone_number,
            date: req.body.date,
            time_start: time_start,
            time_end: time_end,
            reserv_description: req.body.reserv_description,
            _id: req.params.id
        })

        if(!errors.isEmpty()) {
            // Если есть ошибки
            Table.find({})
                .exec(function(err, tables) {
                    if (err) { return next(err); }
                    res.render('tableinstance_form', {
                        title: 'Изменить бронирование стола',
                        tables: tables,
                        tableinstance: tableinstance,
                        errors: errors.array()
                    });
                })

            return;
        }
        // проверить что нет пересечений с существующими периодами
        else {
            async.parallel({
                tables: function(callback) {
                    Table.find(callback);
                },
                tableinstances: function(callback){
                    Tableinstance.find({'table': req.body.table, 'date':req.body.date}, 'table date time_start time_end')
                    .exec(callback)
                }
            }, function (err, results){
                    if (err) { return next(err); }
                    // Ищем бронирования на ту же дату и проверяем время
                    var was_collision = false
                    var collision_inst = [];
                    var tableinstances_arr = []
                    if (results.tableinstances.length) {
                        results.tableinstances.forEach(inst => {
                            if (inst._id != req.params.id){
                                tableinstances_arr.push(inst)
                            }
                        });
                    }

                    if (tableinstances_arr.length) {
                        tableinstances_arr.forEach(inst => {
                            var inst_start = inst.time_start
                            var inst_end = inst.time_end

                            if(!(time_end <= inst_start || time_start >= inst_end))
                            {
                                was_collision = true;
                                collision_inst.push(inst);
                            }
                        });
                        if (!was_collision) {
                            Tableinstance.findByIdAndUpdate(req.params.id, tableinstance, {}, function(err, the_tableinstance){
                                if (err) { return next(err); }
                                res.redirect(the_tableinstance.url);
                            });
                        }
                        else {
                            res.render('tableinstance_form', {
                                    title: 'Изменить бронирование стола',
                                    tables: results.tables,
                                    tableinstance: tableinstance,
                                    custom_err: 'Выбранное время пересекает другой период',
                                    instances_err: collision_inst,
                                });
                        }
                    }
                    else {
                        Tableinstance.findByIdAndUpdate(req.params.id, tableinstance, {}, function(err, the_tableinstance){
                            if (err) { return next(err); }
                            res.redirect(the_tableinstance.url);
                        });
                    }
                });
        }
    }
];


// Форма поиска бронирования по id, дате
exports.getinstances_get = function(req, res) {
    res.render('getinstance_form', { title: 'Информация о бронировании' });
}
exports.getinstances_post = [
    body('instance_id', 'неправильный id бронирования').trim().optional({ checkFalsy: true})
    .isLength({min: 24, max: 24}).matches(/[a-z0-9]/).escape(),
    body('instance_date').trim().escape(),
    body('name').trim().escape(),
    (req, res, next) => {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            res.render('getinstance_form', {
                title: 'Информация о бронировании',
                instance_id: req.body.instance_id,
                instance_date: req.body.instance_date,
                name: req.body.name,
                errors: errors.array()
            });
            return;
        }
        // поиск по id бронирования
        if(req.body.instance_id){
            console.log("Поиск по Id")
            async.parallel({
                tableinstance: function(callback) {
                    Tableinstance.findById(req.body.instance_id)
                    .populate('table')
                    .exec(callback)
                },
            }, function(err, results) {
                if (err) { return next(err); }
                if (results.tableinstance == null) {
                    res.render('getinstance_form', {
                        title: 'Информация о бронировании',
                        custom_err: 'Бронирование ' + req.body.instance_id + ' - не найдено',
                        errors: errors.array()
                    });
                    return;
                }
                // Удачно, значит редирект.
                res.redirect(results.tableinstance.url)
            });
        }
        // поиск по дате
        else if (req.body.instance_date && !req.body.name) {
            console.log("Поиск по дате")
            async.parallel({
                tableinstances: function(callback) {
                    Tableinstance.find({date: req.body.instance_date})
                    .populate('table')
                    .exec(callback)
                },
            }, function(err, results) {
                if (err) { return next(err); }
                if (results.tableinstances==null) {
                    console.log('TEST: error')
                    res.render('getinstance_form', {
                        title: 'Информация о бронировании',
                        instance_date: req.body.instance_date,
                        errors: errors.array()
                    });
                }
                // Удачно, значит редирект.
                res.render('getinstance_form', {
                    title: 'Информация о бронировании',
                    instance_date: req.body.instance_date,
                    instances: results.tableinstances,
                    errors: errors.array()
                });
            });
        }
        // есть дата и имя пользователя
        else if (req.body.instance_date && req.body.name) {
            console.log("Поиск по дате и имени")
            async.parallel({
                tableinstances: function(callback) {
                    Tableinstance.find({date: req.body.instance_date, user: req.body.name})
                    .populate('table')
                    .exec(callback)
                },
            }, function(err, results) {
                if (err) { return next(err); }
                if (results.tableinstances==null) {
                    console.log('TEST: error')
                    res.render('getinstance_form', {
                        title: 'Информация о бронировании',
                        instance_date: req.body.instance_date,
                        errors: errors.array()
                    });
                }
                // Удачно, значит редирект.
                res.render('getinstance_form', {
                    title: 'Информация о бронировании',
                    instance_date: req.body.instance_date,
                    instances: results.tableinstances,
                    errors: errors.array()
                });
            });
        }
        // только имя пользователя
        else if (!req.body.instance_id && req.body.name) {
            console.log("Поиск по имени")
            async.parallel({
                tableinstances: function(callback) {
                    Tableinstance.find({ user: req.body.name })
                    .populate('table')
                    .exec(callback)
                },
            }, function(err, results) {
                if (err) { return next(err); }
                if (results.tableinstances==null) {
                    console.log('TEST: error')
                    res.render('getinstance_form', {
                        title: 'Информация о бронировании',
                        instance_date: req.body.instance_date,
                        errors: errors.array()
                    });
                }
                // Удачно, значит редирект.
                res.render('getinstance_form', {
                    title: 'Информация о бронировании',
                    instance_date: req.body.instance_date,
                    instances: results.tableinstances,
                    name: req.body.name,
                    errors: errors.array()
                });
            });
        }
        else {
            console.log("Все поля пустые")
            res.render('getinstance_form', {
                title: 'Информация о бронировании',
                custom_err: 'Все поля пустые'
             });
        }
    }
];


// Детализация бронирования
exports.tableinstance_detail = function(req, res, next) {

    async.waterfall([
        function(callback) {
            Tableinstance.findOne({_id: req.params.id}, function(err, instance) {
                callback(null, instance)
            }).populate('table')
        },
        function(instance, callback) {
            if (!instance) callback(new Error('Table instance not found'));

            Table.findById(instance.table.id, function(err, table) {
                callback(null, table, instance)
            }).populate()
        }
    ], function(err, table, instance) {
        if (err) { return next(err); }

        if(instance == null) {
            var err = new Error('Бронирование не обнаружено');
            err.status = 404;
            return next(err);
        }

        if(table == null) {
            var err = new Error('Стол не обнаружен');
            err.status = 404;
            return next(err);
        }

        res.render('tableinstance_detail', {title: "Бронирование", instance: instance, table: table});
    });
};