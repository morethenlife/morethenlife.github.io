(function() {

    var app = {

        // инициализация, "точка входа"
        initialize : function () {
            app.build();
            app.registerHelper();
        },

        // объект, который содержит всю информацию
        //о товарах и о текущем заказе
        order: {
            goods : []
        },

        // сумма заказа
        totalPrice: 0,

        // запрашивает данные с сервера и отрисовывает их в DOM
        build: function () {
            $.ajax({
                url: 'data.json',
                dataType: 'JSON'    //добавлено на основе вебинара по js-магазину
            }).done(function(data){
                app.products = data; // кэшируем продукты
                app.fillOrderObject(app.products); //добавляем продукты в массив

                var html = app.fillTemplate('#blocks', data); // заполняем шаблон данными
                $('#product-area').append(html); // вставляем данные в DOM

                app.modules(); // подключаем модули,
                app.setUpListeners(); // подключаем прослушку событий

            }).fail(function(){
                console.log('ajax fail!');
            });

        },

        // заполняем шаблон данными
        fillTemplate: function (sourceId, data){
            var source   = $(sourceId).html(),
                template = Handlebars.compile(source);
            return(template(data));
        },

        // заполняет объект(массив) ORDER товарами,
        // также добавляет необходимые в будущем свойства
        // 'amount' и 'productSum'
        fillOrderObject: function (data){
            $.each(data.blocks, function(index, val) {
                app.order.goods.push({
                    'productNameRus' : val.rus,
                    'productAlias'   : val.alias,
                    'productPrice'   : val.price,
                    'productUnit'    : val.unit,
                    'amount'         : 0,
                    'productSum'     : 0
                });
            });
        },
        /* ------------------------------- */

        // инициализирует хэлперы шаблонизатора Handlebars
        registerHelper: function () {
            // Запрещает отрисовывать в корзине заказы с нулевым amount
            Handlebars.registerHelper('if', function(conditional, options) {
                if(conditional) {
                    return options.fn(this);
                }
            });
        },

        // инициализирует модули и плагины
        modules: function () {
            app.spinners = $( ".spinners" ).spinner({max: 10, min: 0}); // подключаем jquery ui
        },


        // подключает прослушку событий
        setUpListeners: function () {
            $(window).on('scroll', app.scroll);                            // скролл окна (показываем/прячем блочок с корзиной)
            $(".spinners").on( "spin", app.changeOrderSpin );              // меняем количество товара в спиннере
            $(".imageOrderImg").on("click", app.changeOrderImg);           // меняем количество товара кликом по картинке
            $('.doit').on('click', '.navbar__orderbutton', app.showModal); // клик на "Оформить заказ"
            $("#order-form").on('submit', app.formSubmit);                 // отправка формы (заказ)
            $('#order').on('spin', '.spinners', app.spinInCart);           // пересчитываем значения в корзине
        },

        /* добавляем или убираем товар из корзины по нажатию на кнопки + и - */
        changeOrderSpin: function (event, ui) {
            $(".alert").hide();

            var thisInput = event.currentTarget,
                newVal = ui.value,
                input = $(thisInput),
                productAlias = input.attr("data");

            app.preOrder(newVal, productAlias);
        },
        /* ------------------------------------------------ */

        // Добавление в корзину (то же, что и app.changeOrderSpin),
        // срабатывает при клике на картинку товара
        // ( добавить можно не более 10 единиц товара )
        changeOrderImg: function (event) {
            $('.alert').hide(); // прячем сообщение о пустой корзине

            var that = event.currentTarget,
                input = $(that).nextAll('.caption').children('.stokInput').children('.ui-spinner').children('.ui-spinner-input'),
                productAlias = input.attr('data'),
                currentVal = input.val(),
                newVal = parseInt(currentVal) + 1;

            if (newVal > 10)
            {
                newVal = 10;
                currentVal = newVal - 1;
            }
            input.val(newVal);

            app.preOrder(newVal, productAlias);
        },
        /* ------------------------------------------------ */

        /* Наполняем объект заказа app.order */
        preOrder: function (value, productAlias) {

            $.each( app.order.goods , function(index, val) {
                if ( val.productAlias === productAlias ){
                    val.amount = value;
                    val.productSum = value * val.productPrice;
                }
            });

            var sum = app.totalPriceFunc(),
                amount = app.numberOfProductsFunc();

            app.renderCartBox(sum, amount);
        },
        /* ------------------------------------------------ */

        // считает общую стоимтось заказа
        totalPriceFunc: function () {
            var totalPrice = 0;
                $.each(app.order.goods, function(index, val) {
                    totalPrice = totalPrice + val.productSum; // общая сумма заказа
                });

            app.totalPrice = totalPrice; // кэширует общую стоимость заказа
            return(totalPrice);
        },
        /* ------------------------------------------------ */

        // считает общее кол-во продуктов
        numberOfProductsFunc: function () {
            var numberOfProducts = 0;
                $.each(app.order.goods, function(index, val) {
                    numberOfProducts = numberOfProducts + val.amount; // сколько всего товаров в корзине
                });
            return(numberOfProducts);
        },
        /* ------------------------------------------------ */

         // выводит сумму заказа в блок корзины
        renderCartBox: function(sum, amount) {
            var res;
            if (amount !== 0){
                res = '<b>' + amount + '</b> товаров на <b>' + sum + '</b> <i class="icon-rouble"></i>';
                app.orderStatus = 'filled';
            }else{
                res = 'Ваша корзина пуста';
                app.orderStatus = 'empty';
            }

            $('#status').html(res);
        },
        /* ------------------------------------------------ */

        // Рендерит заказ (продукты) в корзиные
        renderOrder: function () {
            var data = app.order; // подготавливаем объект для данных для Handlebars

            data.totalPrice = app.totalPrice; // добавляем в него общую стоимость заказа

            var html = app.fillTemplate('#order-template', data); // заполняем шаблон данными
            $('#order').html(html);// вставляем данные в DOM

            var spinner = $( ".spinners" ).spinner({max: 10, min: 0}); // подключаем jquery ui для отрендеренных инпутов
        },
        /* ------------------------------------------------ */

        // изменение заказа в корзине
        spinInCart: function (event, ui) {
            var thisInput = event.currentTarget,
            newVal = ui.value,
            input = $(thisInput),
            productAlias = input.attr('data'),
            productLine = input.parents('.cart-prod-line'),
            productPrice = input.attr('data-price');

            productLine.find('.current-sum').text(productPrice * newVal); // пересчитываем стоимость текущего товара в модальном окне
            app.preOrder(newVal, productAlias); // обновляем объект заказа
            $('#total-sum').val(app.totalPrice); // пересчитываем общую стоимость заказа в модальном окне
            app.productAreaSpinnersUpdate(newVal, productAlias); // обновляем спиннеры главной области
        },

        // обновляем спиннеры главной области
        productAreaSpinnersUpdate: function(newVal, productAlias){
            var spinInput = $('#product-area').find('input[data="' + productAlias + '"]');
            spinInput.spinner( "value", newVal );
        },
        /* ------------------------------------------------ */

        // показывает/прячет блок с корзиной
        scroll: function () {
            var top = $(window).scrollTop(),
                cart = $(".caption__cart");
            if (top > 200) {
                cart.addClass("cart_fixed");
            } else {
                cart.removeClass("cart_fixed");
            }
        },
        /* ------------------------------------------------ */

        // показывает корзину
        showModal: function () {
            if(app.orderStatus === 'filled'){ // если корзина не пуста
                app.renderOrder();
                $('.alert').hide();
                var modalWindow = $('#myModal');
                modalWindow.modal('show');
                // в случае, если форма открывается во второй раз, после отправки заказа
                modalWindow.find('form').show();
                modalWindow.find('button[type="submit"]').show();
                modalWindow.find('.done-box').remove();
            }else{ // если корзина пуста
                $('.alert').show(); // показываем сообщение
            }
        },
        /* ------------------------------------------------ */


        // отправляет запрос на сервер
        formSubmit: function (ev) {
            ev.preventDefault();
            var form = $(this),
                name = $('#name').val(),
                phone = $('#phone').val(),
                email = $('#email').val(), //адрес почты клиента
                goods = [],
                total = app.totalPrice,
                modalDialog = $('.modal-dialog'),
                submitBtn = modalDialog.find('button[type="submit"]'),
                msgBox = $('.msg');

            msgBox.html(''); // очищаем блок сообщений с сервера

            console.log('Присваиваем переменные!');


            $.each(app.order.goods, function(index, val) {
                if(val.amount !== 0){
                    goods.push({
                            'productNameRus' : val.productNameRus,
                            'productPrice'   : val.productPrice,
                            'amount'         : val.amount,
                            'productUnit'    : val.productUnit,
                            'productSum'     : val.productSum
                    });
                }
            });

            var data = {
                'goods' : goods,
                'total' : total,
                'name' : name,
                'phone' : phone,
                'email' : email
            };

            console.log(data);

            submitBtn.attr({disabled: 'disabled'}).addClass('spin-btn'); // защита от повторного нажатия + показываем загрузчик

            $.ajax({
                type: "POST",
                url: "contact_form/contact_process.php",
                data: data
            }).done(function(msg){
                if(msg == 'OK') {
                    var result = '<div class="done-box">Спасибо за Ваш заказ!<br> Мы свяжемся с вами в течение дня.</div>';
                        modalDialog.find('.modal-body').append(result); // вставляем сообщение
                        submitBtn.hide(); // удаляем кнопку ЗАКАЗАТЬ
                        form.hide(); // прячем форму
                        // очищаем заказ, корзину, объекты и свойства
                        app.spinners.spinner( "value", 0 );
                        $('#status').html('Ваша корзина пуста');
                        app.order.goods = [];
                        app.fillOrderObject(app.products);
                        app.totalPrice = 0;
                } else {
                    $(".msg").html(msg);
                }
            }).fail(function(){
                console.log('ajax fail!');
            }).always(function(){
                submitBtn.removeAttr('disabled').removeClass('spin-btn');
            });
            return false;
        }
        /* ------------------------------------------------ */

    };

    app.initialize();

}());



