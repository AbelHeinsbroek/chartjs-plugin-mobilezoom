import Chart from 'chart.js'
import Hammer from 'hammerjs'

var mobileZoomPlugin = {

  id: 'mobilezoom',

  afterInit: function(chart) {


    if (chart.config.options.scales.xAxes.length == 0) {
      return
    }

    var xScaleType = chart.config.options.scales.xAxes[0].type

    if (xScaleType !== 'linear' && xScaleType !== 'time') {
      return;
    }

    chart.mobileZoom = {}

    // add new canvasses
    chart.mobileZoom.ca2 = document.createElement('canvas')
    chart.mobileZoom.ca3 = document.createElement('canvas')
    chart.mobileZoom.c2 = chart.mobileZoom.ca2.getContext('2d')
    chart.mobileZoom.c3 = chart.mobileZoom.ca3.getContext('2d')


    var iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

    if(iOS) {
      chart.mobileZoom.hammer = new Hammer(chart.canvas,{touchAction: 'auto'})
    } else {
      chart.mobileZoom.hammer = new Hammer(chart.canvas)
    }

    // enable pinch event
    chart.mobileZoom.hammer.get('pinch').set({enable: true})

    chart.canvas.addEventListener("touchstart", function(event) {
      if (event.touches.length >= 2) {
        chart.mobileZoom.hammer.get("pinch").set({ enable: true });
      }
    });

    chart.canvas.addEventListener("touchend", function(event) {
      if (event.touches.length < 2) {
        chart.mobileZoom.hammer.get("pinch").set({ enable: false });
      }
    });

    chart.mobileZoom.hammer.get( 'pan' ).set({
      direction: Hammer.DIRECTION_HORIZONTAL,
    });

    // enable pinch event
    chart.mobileZoom.hammer.get('pinch').set({enable: true})
    // add event listeners
    // panning
    chart.mobileZoom.hammer.on('panstart', function(ev) { 
      ev.preventDefault()
      this.panStart(chart, ev)
    }.bind(this))
    chart.mobileZoom.hammer.on('panmove', function(ev) { 
      ev.preventDefault()
      this.panMove(chart, ev)
    }.bind(this))
    chart.mobileZoom.hammer.on('panend', function(ev) { 
      ev.preventDefault()
      this.endPanZoom(chart)
    }.bind(this))
    // zooming
    chart.mobileZoom.hammer.on('pinchstart', function(ev) { 
      ev.preventDefault()
      this.pinchStart(chart, ev)
    }.bind(this))
    chart.mobileZoom.hammer.on('pinchmove', function(ev) { 
      ev.preventDefault()
      this.pinchMove(chart, ev)
    }.bind(this))
    chart.mobileZoom.hammer.on('pinchend', function(ev) { 
      ev.preventDefault()
      this.pinchEnd(chart, ev)
    }.bind(this))

    chart.mobileZoom.hammer.on('doubletap', function(ev) { 
      ev.preventDefault()
      chart.options.plugins.mobilezoom.callbacks.doubleTap()
    })
  },

  getXScale: function(chart) {
    return chart.data.datasets.length ? chart.scales[chart.getDatasetMeta(0).xAxisID] : null;
  },
  getYScale: function(chart) {
    return chart.scales[chart.getDatasetMeta(0).yAxisID];
  },
  getPointers: function(chart, ev) {
    var x1,x2
    if(ev.pointers[0].clientX > ev.pointers[1].clientX) {
      x1 = ev.pointers[1].clientX; x2 = ev.pointers[0].clientX
    } else {
      x1 = ev.pointers[0].clientX; x2 = ev.pointers[1].clientX
    }
    // get page position
    var rect = ev.target.getBoundingClientRect();
    x1 -= rect.left
    x2 -= rect.left

    var scale = this.getXScale(chart)
    return [scale.getValueForPixel(x1),scale.getValueForPixel(x2)]
  },

  panStart: function(chart, ev) {
    var x1 = this.getXScale(chart).getValueForPixel(ev.pointers[0].clientX)
    this.startPanZoom(chart, x1,x1)
  },
  panMove: function(chart, ev) {
    var x1 = this.getXScale(chart).getValueForPixel(ev.pointers[0].clientX)
    this.doPanZoom(chart, x1,x1)
  },
  panEnd: function(chart, ev) {
    this.endPanZoom(chart)
  },
  pinchStart: function(chart, ev) {
    var pointers = this.getPointers(chart, ev)
    this.startPanZoom(chart, pointers[0], pointers[1])
  },
  pinchMove: function(chart, ev) {
    var pointers = this.getPointers(chart, ev)
    this.doPanZoom(chart, pointers[0], pointers[1])
  },
  pinchEnd: function(chart, ev) {
    this.endPanZoom(chart)
  },


  startPanZoom: function(chart,x1,x2) {

    chart.mobileZoom.x1 = x1
    chart.mobileZoom.x2 = x2

    chart.mobileZoom.xmin_current = this.getXScale(chart).min
    chart.mobileZoom.xmax_current = this.getXScale(chart).max

    var xmin = this.getXScale(chart).getPixelForValue(chart.mobileZoom.xmin_current)
    var xmax = this.getXScale(chart).getPixelForValue(chart.mobileZoom.xmax_current)
    var ymin = this.getXScale(chart).getPixelForValue(this.getYScale(chart).min)
    var ymax = this.getXScale(chart).getPixelForValue(this.getYScale(chart).max)

    var width = xmax-xmin
    var height = ymin-ymax
    // capture chart area
    var pr = window.devicePixelRatio;
    chart.mobileZoom.imageData = chart.ctx.getImageData(0,0,chart.canvas.width*pr,chart.canvas.height*pr)
  },
  doPanZoom: function(chart, x11, x22) {
    var x1 = chart.mobileZoom.x1
    var x2 = chart.mobileZoom.x2
    var xmin_current = chart.mobileZoom.xmin_current

    var width = this.getXScale(chart).max - this.getXScale(chart).min
    var scale = (x11 != x22) ? (x2-x1) / (x22-x11) : 1
    var xmin_target = x1-x11*scale + xmin_current * scale
    var xmax_target = xmin_target + width * scale
    this.clip(chart, scale, xmin_target, xmax_target)
  },
  endPanZoom: function(chart) {
    var xScaleType = chart.config.options.scales.xAxes[0].type
    if(xScaleType == 'time') {
      chart.options.scales.xAxes[0].time.min = chart.mobileZoom.xmin_target
      chart.options.scales.xAxes[0].time.max = chart.mobileZoom.xmax_target
    } else {
      chart.options.scales.xAxes[0].ticks.min = chart.mobileZoom.xmin_target
      chart.options.scales.xAxes[0].ticks.max = chart.mobileZoom.xmax_target
    }
    chart.update(0)
    // afterzoom
    if(xScaleType == 'time') {
      chart.options.plugins.mobilezoom.callbacks.afterZoomPan(new Date(chart.mobileZoom.xmin_target), new Date(chart.mobileZoom.xmax_target))
    } else {
      chart.options.plugins.mobilezoom.callbacks.afterZoomPan(chart.mobileZoom.xmin_target, chart.mobileZoom.xmax_target)
    }
  },

  clip: function(chart, scale, xmin_target, xmax_target) {

    var xmin = this.getXScale(chart).getPixelForValue(chart.mobileZoom.xmin_current)
    var xmax = this.getXScale(chart).getPixelForValue(chart.mobileZoom.xmax_current)
    var ymin = this.getYScale(chart).getPixelForValue(this.getYScale(chart).min)
    var ymax = this.getYScale(chart).getPixelForValue(this.getYScale(chart).max)

    var chart_width = xmax-xmin // get pixel width of graph area
    var chart_height = ymin-ymax // get pixel height of graph area

    chart.mobileZoom.ca2.width = chart.canvas.width
    chart.mobileZoom.ca2.height = chart.canvas.height

    chart.mobileZoom.ca3.width = chart_width
    chart.mobileZoom.ca3.height = chart_height

    // clear graph area
    chart.ctx.clearRect(xmin,ymax, chart_width, chart_height)

    // get offset from current xmin and xmax to the new xmin and xmax targets relative to the new, resized, projection
    var dx = (chart.mobileZoom.xmin_current - xmin_target)*chart_width/(xmax_target-xmin_target)
    var dx2 = (chart.mobileZoom.xmax_current - xmin_target)*chart_width/(xmax_target-xmin_target)

    // get new chart area width
    var dwidth = dx2-dx

    // get pixel ratio
    var pr = window.devicePixelRatio;
    // paste image data to canvas 2
    chart.mobileZoom.c2.putImageData(chart.mobileZoom.imageData,0,0)
    // copy and rescale image to canvas 3 with scale and offset
    chart.mobileZoom.c3.drawImage(chart.mobileZoom.ca2, xmin*pr, ymax*pr, chart_width*pr, chart_height*pr, dx,0, dwidth, chart_height)
    // transfer image back to canvas 1 (chart canvas)
    chart.ctx.drawImage(chart.mobileZoom.ca3, xmin, ymax, chart_width, chart_height)

    chart.mobileZoom.xmin_target = xmin_target
    chart.mobileZoom.xmax_target = xmax_target
  }

}


Chart.plugins.register(mobileZoomPlugin)
