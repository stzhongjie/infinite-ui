/**
 * layer 组件
 * @param  {String}            container           组件的执行上下文环境，默认是body
 * @param  {Boolean}           cache               是否缓存 ajax 页面
 * @param  {Boolean}           shadow              是否开启阴影层关闭
 * @param  {String}            confirmHandle       确认按钮Class
 * @param  {String}            closeHandle         关闭按钮Class
 * @param  {String}            offsetWidth         layer 宽度
 * @param  {String}            offsetHeight        layer 高度
 * @param  {String}            url                 ajax url
 * @param  {String}            dataType            ajax dataType : html,json,xml ...
 * @param  {String}            method              ajax type : get/post
 * @param  {String}            data                ajax data
 * @param  {Function}          successCall         ajax success callback
 * @param  {Function}          errorCall           ajax error callback
 * @param  {Function}          showCall            回调函数 - 显示触发
 * @param  {Function}          confirmCall         回调函数 - 确认触发
 * @param  {Function}          cancelCall          回调函数 - 关闭触发
 *
 * @method [showLayer]  显示层
 * @method [hideLayer]  隐藏层
 * @method [ajaxLoad]   ajax 弹层
 * @method [cutTo]      切换层
 *
 * @event
 *
 * $('selector').on('layer.show',function(){});
 * $('selector').on('layer.hide',function(){});
 *
 * @example
 *
 * var layerId = $('#layerId').IUI('layer'); // 注意：layerId必须是唯一，当页面中没有div#layerId，将自动创建，并 append 到 container 中
 * layerId.showLayer();
 * layerId.hideLayer();
 * layerId.ajaxLoad();
 *
 * html基本结构
 * div.layer-box.hide#layerId>div.layer-content
 *
 *
 */

(function($, window) {
        var version = '3.1.0';
        var scrollBarWidth = IUI_UTILS.scrollBarWidth;
        var $body = $('body');
        var backdrop = $('<div class="layer-backdrop"></div>');

        function Layer(config, selector) {
            var defaults = {
                container: 'body',
                cache: false,
                shadow: true,
                confirmHandle: '.btn-confirm',
                closeHandle: '.btn-cancel,.btn-close',
                offsetWidth: 'auto',
                offsetHeight: 'auto',
                url: $(this).attr('data-url') || false,
                dataType: $(this).attr('data-dataType') || 'html',
                data: '',
                method: 'GET',
                content: '',
                animateDisable:false,
                zIndex:0,
                showCall: function() {},
                hideCall: function() {},
                successCall: function() {},
                errorCall: function() {},
                confirmCall: function() {},
                cancelCall: function() {}
            };
            this.$selector = selector;
            this.config = $.extend(defaults, config);
            //创建遮罩层
            this.$backdrop = $('<div class="layer-backdrop"></div>');
            this.init();
            this.event();
        }

        Layer.prototype.init = function() {
            var self = this;
            var config = self.config;
            var template = '<div class="layer-box hide" id="{{layerName}}"><div class="layer-content">' + config.content + '</div></div>';
            var $selector = this.$selector = self.$selector.length ? self.$selector : $(template.replace('{{layerName}}', self.$selector.selector.replace('#', ''))).appendTo(config.container);
            var $container = config.container === 'body' ? $body : $(config.container);
            var closeHandle = config.closeHandle;
            var $content = this.$content = $selector.find('.layer-content');
            var layerWidth = Number($selector.attr('data-width')) || config.offsetWidth;
            var layerHeight = Number($selector.attr('data-height')) || config.offsetHeight;

            if(config.zIndex){
                self.$backdrop.css('z-index',config.zIndex);
                $selector.css('z-index',config.zIndex + 10);
            }

            $content.css({
                width: layerWidth,
                height: layerHeight
            });

            $selector.data('layer', self);


        };

        Layer.prototype.ajaxLoad = function() {
            var self = this;
            var config = self.config;
            var $selector = self.$selector;
            var requestUrl = config.url || '?';
            var method = ($selector.attr('data-method') || config.method).toUpperCase();
            var dataType = config.dataType;

            if (config.cache && $selector.data('success')) {
                self.showLayer();
                return false;
            }

            $.loading(true, true);
            $selector.data('success', 1);

            $.ajax({
                url: requestUrl,
                type: method,
                dataType: dataType,
                data: config.data
            }).then(function(res) {
                $.loading(false);
                config.successCall.apply($selector, [res, this, self]);
                self.showLayer();
            }, function(err) {
                $.loading(false);
                self.hideLayer();
                config.errorCall.apply($selector, [err, this, self]);
            });

            return self;
        };

        Layer.prototype.event = function() {
            var self = this;
            var config = self.config;
            var $selector = self.$selector;

            //确认事件
            $selector.on('click.iui-layer', config.confirmHandle, function(event) {
                event.preventDefault();
                config.confirmCall.apply($selector, [event, self]);
                return false;
            });

            // 阴影层事件
            $selector.on('click.iui-layer', function(event) {
                if ($(event.target).is($selector)) {

                    if (!config.shadow) {
                        return false;
                    }
                    if ($body.find('.layer-loading').length) {
                        return false;
                    }
                    self.hideLayer();
                    config.cancelCall.apply($selector, [event, self]);
                }
            });


            //绑定关闭事件
            $selector.on('click.iui-layer', config.closeHandle, function(event) {
                self.hideLayer();
                config.cancelCall.apply($selector, [event, self]);
                return false;
            });
        };

        Layer.prototype.showLayer = function(cutto) {
            var self = this;
            var config = self.config;
            var $backdrop = self.$backdrop;
            var $body = $('body');
            var screenH = document.documentElement.clientHeight;
            var gtIE10 = document.body.style.msTouchAction === undefined;
            var isCutto = cutto;
            var Q = $.Deferred();
            // 当body高度大于可视高度，修正滚动条跳动
            // >=ie10的滚动条不需要做此修正,tmd :(
            if ($body.height() > screenH & (gtIE10)) {
                $body.data('initstyle',$body.attr('style') || '');
                $body.css({
                    'border-right': scrollBarWidth + 'px transparent solid',
                    'overflow': 'hidden'
                });

            }
            //显示层
            self.$selector.removeClass('hide');
            self.$content.off(IUI_UTILS.animateEnd);

            if (isCutto) {
                self.$content.removeClass('layer-opening');
            } else {
                //插入-遮罩-dom
                self.$selector.after($backdrop);
                //插入-遮罩-显示动画
                $backdrop.attr('style', 'opacity: 1;visibility: visible;');
            }

            //插入-弹层-css3显示动画
            self.$content.addClass('layer-opening');

            IUI_UTILS.animateEndShim(self.$content, function(event) {
                self.$content.removeClass('layer-opening');
                //触发show事件
                self.$selector.trigger('layer.show', [self]);
                //触发showCall回调
                config.showCall.apply(self.$selector, [self]);

                Q.resolve();
            },config.animateDisable);

            // 绑定 esc 键盘控制
            $(document).on('keyup.iui-layer', function(event) {
                if (event.keyCode === 27) {
                    self.$selector.trigger('click.iui-layer', config.closeHandle);
                }
            });

            //返回Layer对象
            return Q;
        };


        Layer.prototype.hideLayer = function(cutto) {
            var self = this;
            var config = self.config;
            var isCutto = cutto;
            var Q = $.Deferred();
            //插入-弹层-隐藏动画
            self.$content.off(IUI_UTILS.animateEnd);
            self.$content.addClass('layer-closing');
            if (!isCutto) {
                self.$backdrop.removeAttr('style');
                IUI_UTILS.transitionEndShim(self.$backdrop, function() {
                    self.$backdrop.remove();
                },config.animateDisable);
            }
            IUI_UTILS.animateEndShim(self.$content, function(event) {
                //插入-遮罩-隐藏动画
                self.$content.removeClass('layer-closing');
                //隐藏弹层
                self.$selector.addClass('hide');

                //触发hide事件
                self.$selector.trigger('layer.hide', [this]);
                //触发hideCall回调
                config.hideCall.apply(self.$selector, [self]);
                Q.resolve();
            },config.animateDisable);


            //恢复 body 滚动条
            $body.attr('style',$body.data('initstyle'));

            // 绑定 esc 键盘控制
            $(document).off('keyup.iui-layer');
            return Q;
        };

        Layer.prototype.cutTo = function(nextId, currentId) {
            var nextLayer = $(nextId).data('layer');
            var currentLayer = (currentId ? $(currentId) : this.$selector).data('layer');
            if (nextLayer.$backdrop.width() === 0) {
                nextLayer.$backdrop = currentLayer.$backdrop;
            }
            currentLayer.hideLayer(true).done(function(){
                nextLayer.showLayer(true);
            });

        };

        Layer.prototype.destroy = function() {
            var self = this;
            var $selector = self.$selector;
            //确认事件
            $selector.remove();
        };


        $.fn.IUI({
            layer: function(config) {
                return new Layer(config, this);
            }
        });

    }(jQuery, window));