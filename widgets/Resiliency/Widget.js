jsonCats = 'widgets/Resiliency/data/cats.json'
jsonLyrs = 'widgets/Resiliency/data/lyrs.json'
jsonSegs = 'widgets/Resiliency/data/segs.json'
jsonGIds = 'widgets/Resiliency/data/gids.json'
jsonWithinBufferFolder = 'widgets/Resiliency/data/within_buffers/'

var sCurCommunities = "";
var dCurCommunities = [];
var lyrRTPResiliencySegs;
var lyrRTPResiliencySegs_Selected;
var sRTPResiliencySegs = 'RTP Resiliency Segments';
var sRTPResiliencySegs_Selected = 'RTP Resiliency Projects Selected';

var WIDGETPOOLID_LEGEND = 0;
var WIDGETPOOLID_SCORE = 2;

var strSelectedPriorities = '';

var numCats = 0;
var ctCats = 0;

var dWithinBuffers = [];
var dWithinBuffersIndex = [];

var curCheckedLayers = [];
var curCatWeights = [];

var curBuffer = 300;

var segScores = [];

var maxScore = 0;

define(['dojo/_base/declare',
  'dojo/dom',
  'dojo/dom-style',
  'dojo/dom-construct',
  'dojo/on',
  'dijit/registry',
  'jimu/BaseWidget',
  'dijit/form/CheckBox',
  'dojo/html',
  'dojo/domReady!',
  'esri/layers/FeatureLayer',
  'jimu/LayerInfos/LayerInfos',
  'dijit/form/ToggleButton',
  'dijit/form/Select',
  'dijit/form/Button',
  'dijit/form/ComboBox',
  'esri/tasks/query',
  'esri/tasks/QueryTask',
  'esri/geometry/Extent',
  'esri/renderers/UniqueValueRenderer',
  'esri/symbols/SimpleFillSymbol',
  'esri/symbols/SimpleLineSymbol',
  'esri/symbols/SimpleMarkerSymbol',
  'esri/Color',
  'jimu/PanelManager',
  'esri/graphic',
  'dojo/store/Memory'],
  function (declare, dom, domStyle, domConstruct, on, registry, BaseWidget, CheckBox, html, domReady, FeatureLayer, LayerInfos, ToggleButton, Select, Button, ComboBox, Query, QueryTask, Extent, UniqueValueRenderer, SimpleFillSymbol, SimpleLineSymbol, SimpleMarkerSymbol, Color, PanelManager, Graphic, Memory) {
    //To create a widget, you need to derive from BaseWidget.
    return declare([BaseWidget], {
      // Custom widget code goes here

      baseClass: 'jimu-widget-customwidget',

      //this property is set by the framework when widget is loaded.
      //name: 'CustomWidget',


      //methods to communication with app container:

      // postCreate: function() {
      //   this.inherited(arguments);
      //   console.log('postCreate');
      // },

      startup: function () {
        this.inherited(arguments);
        //this.mapIdNode.innerHTML = 'map id:' + this.map.id;
        console.log('startup');

        wR = this;
        //this.map.setInfoWindowOnClick(false); // turn off info window (popup) when clicking a feature

        // Initialize Selection Layer, FromLayer, and ToLayer and define selection colors
        var layerInfosObject = LayerInfos.getInstanceSync();
        for (var j = 0, jl = layerInfosObject._layerInfos.length; j < jl; j++) {
          var currentLayerInfo = layerInfosObject._layerInfos[j];
          if (currentLayerInfo.title == sRTPResiliencySegs) {
            lyrRTPResiliencySegs = layerInfosObject._layerInfos[j].layerObject;
            console.log(sRTPResiliencySegs + ' Found');
          } else if (currentLayerInfo.title == sRTPResiliencySegs_Selected) {
            lyrRTPResiliencySegs_Selected = layerInfosObject._layerInfos[j].layerObject;
            lyrRTPResiliencySegs_Selected.setDefinitionExpression("CommCode IN ('NONE')");
            lyrRTPResiliencySegs_Selected.show();
            console.log(sRTPResiliencySegs_Selected + ' Found');
          }
        }

        // set current buffer
        dom.byId('bufferText').value = curBuffer;

        // Populate gisids object
        dojo.xhrGet({
          url: jsonGIds,
          handleAs: "json",
          load: function (obj) {
            /* here, obj will already be a JS object deserialized from the JSON response */
            console.log(jsonGIds);
            dGIds = obj.data;
            wR._dirtyQuery();
          },
          error: function (err) {
            /* this will execute if the response couldn't be converted to a JS object,
               or if the request was unsuccessful altogether. */
          }
        });

        // Populate categories object
        dojo.xhrGet({
          url: jsonSegs,
          handleAs: "json",
          load: function (obj) {
            /* here, obj will already be a JS object deserialized from the JSON response */
            console.log(jsonSegs);
            dSegs = obj.data;
            wR._dirtyQuery();
          },
          error: function (err) {
            /* this will execute if the response couldn't be converted to a JS object,
               or if the request was unsuccessful altogether. */
          }
        });

        // Populate categories object
        dojo.xhrGet({
          url: jsonCats,
          handleAs: "json",
          load: function (obj) {
            /* here, obj will already be a JS object deserialized from the JSON response */
            console.log(jsonCats);
            dCats = obj.data;
            wR._buildMenu();
            numCats = dCats.length;
            wR._readWithinCurBuffer();
          },
          error: function (err) {
            /* this will execute if the response couldn't be converted to a JS object,
               or if the request was unsuccessful altogether. */
          }
        });

        // Populate layers object
        dojo.xhrGet({
          url: jsonLyrs,
          handleAs: "json",
          load: function (obj) {
            /* here, obj will already be a JS object deserialized from the JSON response */
            console.log(jsonLyrs);
            dLyrs = obj.data;
            wR._buildMenu();
          },
          error: function (err) {
            /* this will execute if the response couldn't be converted to a JS object,
               or if the request was unsuccessful altogether. */
          }
        });

        //setup click functionality
        this.map.on('click', selectParcelPiece);

        function pointToExtent(map, point, toleranceInPixel) {
          var pixelWidth = wR.map.extent.getWidth() / wR.map.width;
          var toleranceInMapCoords = toleranceInPixel * pixelWidth;
          return new Extent(point.x - toleranceInMapCoords,
            point.y - toleranceInMapCoords,
            point.x + toleranceInMapCoords,
            point.y + toleranceInMapCoords,
            wR.map.spatialReference);
        }

        //Setup function for selecting communities and parcels

        function selectParcelPiece(evt) {
          console.log('selectParcelPiece');
        }
      },

      _dirtyQuery: function() {
        dom.byId('btnCalculateScores').style.backgroundColor = "red";
        dom.byId('btnCalculateScores').innerHTML = "Run Query";
        var vcUVRenderer = new UniqueValueRenderer({
          type: "unique-value",  // autocasts as new UniqueValueRenderer()
          valueExpression: "return 'class_0';",
          uniqueValueInfos: [
            { value: "class_0", label: "No Results"  , symbol: new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color("#bbbbbb"), 0.5)}
          ]
        });
        lyrRTPResiliencySegs.setRenderer(vcUVRenderer);
      },

      _updateBuffer: function() {
        console.log('_updateBuffer');
        curBuffer = parseInt(dom.byId('bufferText').value);
        wR._readWithinCurBuffer();
      },

      _readWithinCurBuffer: function() {
        console.log('_readWithinCurBuffer');
        if (typeof dCats !== "undefined") {
          ctCats = 0;
          dWithinBuffers = [];
          dWithinBuffersIndex = [];
          for (c in dCats) {
            wR._readWithinBuffers(curBuffer,dCats[c].CategoryCode);
          }
        }
      },

      _readWithinBuffers: function(_buf,_cat) {
        console.log('_readWithinBuffers: buffer: ' + String(_buf) + ' category: ' + _cat);
        // Populate distances object
        dojo.xhrGet({
          // get next layer code
          url: jsonWithinBufferFolder + 'b' + parseInt(_buf) + '_' + _cat + '.json',
          handleAs: "json",
          load: function (obj) {
            console.log(this.url);
            /* here, obj will already be a JS object deserialized from the JSON response */
            dWithinBuffers.push(obj);
            dWithinBuffersIndex.push(this.url.substring(this.url.length - 7, this.url.length - 5));
            ctCats += 1;
            if (ctCats==numCats) {
              wR._dirtyQuery();
            }
          },
          error: function (err) {
            ctCats += 1;
            if (ctCats==numCats) {
              wR._dirtyQuery();
            }
            /* this will execute if the response couldn't be converted to a JS object,
              or if the request was unsuccessful altogether. */
          }
        });
      },

      _showLegend: function () {
        var pm = PanelManager.getInstance();
        pm.showPanel(wR.appConfig.widgetPool.widgets[WIDGETPOOLID_LEGEND]);
        //Close Location Scores if open
        var pm = PanelManager.getInstance();
        for (var p = 0; p < pm.panels.length; p++) {
          if (pm.panels[p].label == 'Location Scores') {
            pm.closePanel(pm.panels[p]);
          }
        }
      },

      _calculateScores: function() {
        console.log('_calculateScores');

        maxScore = 0;

        // make sure objects are defined before entering
        if (typeof dGIds !== "undefined"  && typeof dSegs !== "undefined" && typeof dCats !== "undefined" && typeof dLyrs !== "undefined" && ctCats>0 && ctCats==numCats) {
          
          curCheckedLayers = wR._getListCheckedLayers();
          curCatWeights    = wR._getCatWeights();
          curCatMaxOuts    = wR._getCatMaxOuts();

          let start = Date.now();

          // loop through all gis_ids
          for (g in dGIds) {
            var _segs = dSegs.filter(o => o['g'] == dGIds[g].g);
            // loop through all sequences
            // search for seqs for GIds
            for (s in _segs) {
              _segScore = 0;
              var _index = dGIds[g].g + '_' + _segs[s].s;
              for (c in dCats) {
                var _withinBuffers = dWithinBuffers[dWithinBuffersIndex.indexOf(dCats[c].CategoryCode)]
                var _ctLyrsWithScore = 0;
                var _segCatScore = 0;
                if (typeof _withinBuffers !== "undefined") {
                  var _withinBufferRec = _withinBuffers[_index];
                  if (typeof _withinBufferRec !== "undefined") {
                    var _withinLayers = _withinBufferRec[dCats[c].CategoryCode].split(',');
                    for (_w in _withinLayers) {
                      if (curCheckedLayers.indexOf(_withinLayers[_w])>=0) {
                        if (_ctLyrsWithScore < curCatMaxOuts[c]) {
                          _ctLyrsWithScore += 1;
                        }
                      }
                    }
                    if (curCatMaxOuts[c]>0) {
                      var _segCatScore = _ctLyrsWithScore / curCatMaxOuts[c] * curCatWeights[c];
                    }
                    _segScore += _segCatScore;
                  }
                }
              }
              maxScore = Math.max(maxScore,_segScore);
            }
          }
          let end = Date.now();
          // elapsed time in milliseconds
          let elapsed = end - start;   
            
          // converting milliseconds to seconds 
          // by dividing 1000
          console.log('_calculateScores time: ' + String(elapsed/1000));
          console.log('max score: ' + parseFloat(maxScore))
          wR._updateDisplay();
          dom.byId('btnCalculateScores').style.backgroundColor = "green";
          dom.byId('btnCalculateScores').innerHTML = "Query Complete";
        }
        // get the end time
      },

      _updateDisplay: function () {
        console.log('_updateDisplay');

        // build expression for symbology based on each categories rank

        _scoreExp = "var totScore = 0;";
        _scoreExp += "var catScore = 0;";
        _scoreExp += "var ctLyr    = 0;";

        for (c in dCats) {
          _curbuf = String(curBuffer);
          _weight = String(curCatWeights[c]);
          _maxOut = String(curCatMaxOuts[c]);
          _lyrs = dLyrs.filter(o => o['CategoryCode'] == dCats[c].CategoryCode);
          
          _scoreExp += "catScore = 0;";
          _scoreExp += "ctLyr    = 0;";
          for (l in _lyrs) {
            if (curCheckedLayers.indexOf(_lyrs[l].LayerCode)>=0) {
              _scoreExp += "if ($feature." + _lyrs[l].LayerCode + " >= 0 && $feature." + _lyrs[l].LayerCode + " < " + curBuffer + " && ctLyr < " + _maxOut + " && " + _maxOut + ">0) {" +
                          " catScore +=  " + _weight + " / " + _maxOut + ";" +
                          " ctLyr += 1;" +
                          "}";
            }
          }
          _scoreExp += "totScore += catScore;"
        }


        var vcUVRenderer = new UniqueValueRenderer({
          type: "unique-value",  // autocasts as new UniqueValueRenderer()
          valueExpression: _scoreExp + "" +
            "var score = (totScore) /" + maxScore + ";" +
            "if      (score>=0.95) { return 'class_5'; }" +
            "else if (score>=0.85) { return 'class_4'; }" +
            "else if (score>=0.60) { return 'class_3'; }" +
            "else if (score>=0.30) { return 'class_2'; }" +
            "else                  { return 'class_1'; }",
          uniqueValueInfos: [
            { value: "class_5", label: "Most Accessibility (95-100% of Max)" , symbol: new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color("#031273"), 5)},
            { value: "class_4", label: "High Accessibility (85-95% of Max)"  , symbol: new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color("#2c7fb8"), 4)},
            { value: "class_3", label: "Middle Accessibility (70-85% of Max)", symbol: new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color("#52c7d5"), 3)},
            { value: "class_2", label: "Low Accessibility (50-70% of Max)"   , symbol: new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color("#a1dab4"), 2)},
            { value: "class_1", label: "Least Accessibility (0-50% of Max)"  , symbol: new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color("#ffffcc"), 1)}
          ]

        });
        lyrRTPResiliencySegs.setRenderer(vcUVRenderer);

      },

      //Run when receiving a message
      onReceiveData: function (name, widgetId, data, historyData) {
        //filter out messages
        if (name == 'Location Score') {
          if (data.message == 'remove_location') {
            if (bLocationGraphic) {
              // should only be one graphic in addition to communities at a time (community borders and selection)
              // so remove the last
              wR.map.graphics.remove(wR.map.graphics.graphics[wR.map.graphics.graphics.length - 1]);
              bLocationGraphic = false;
            }
          }
          return;
        }
      },

      _uncheckAll: function () {
        console.log('_uncheckAll')
        _curState = dom.byId(turnoffall).innerHTML;
        for (l in dLyrs) {
          if (_curState=='Uncheck All' && dom.byId('chk' + dLyrs[l].LayerCode).checked==true) {
            dom.byId('chk' + dLyrs[l].LayerCode).checked = false;
            wR._dirtyQuery();
            dom.byId(turnoffall).innerHTML = 'Check All';
          } else if (_curState=='Check All' && dom.byId('chk' + dLyrs[l].LayerCode).checked==false) {
            dom.byId('chk' + dLyrs[l].LayerCode).checked = true;
            wR._dirtyQuery();
            dom.byId(turnoffall).innerHTML = 'Uncheck All';
          }
        }
      },


      _buildMenu: function() {
        console.log('_buildMenu');
        

        // check if data object populated
        if (typeof dCats !== "undefined" && typeof dLyrs !== "undefined") {

          var divMenu = dom.byId("menu");
          
          dojo.forEach(dijit.findWidgets(divMenu), function(w) {
            w.destroyRecursive();
          });
          
          dojo.empty(divMenu);

          for (c in dCats) {

            dojo.place("<br/>", "menu");

            bId = "button" + dCats[c].CategoryCode;

            var button3 = new Button({ label:'▶', id:bId, style:"display:inline"});

            button3.startup();
            button3.placeAt(divMenu);
            button3.on("click", this._expand);

            dojo.style(bId,"width","18px");
            dojo.style(bId,"height","16px");
            //dojo.style(bId,"display","inline-block");

            //dojo.style(bId,"background",sBGColor);
            //dojo.style(bId,"color",sFGColor);
            
            // category heading
            dojo.place("<div class = \"grouptitle\" style=\"display:inline\"><p class=\"thicker\" style=\"display:inline\">" + dCats[c].CategoryName + "</div><br/>", "menu");

            divCatName = "cat" + dCats[c].CategoryCode

            var divCat = domConstruct.create("div",{id:divCatName});

            divCat.style.display='none';

            divMenu.appendChild(divCat);

            // layers div
            dojo.place("<div style=\"display: none;\" id=\"div" + dCats[c].CategoryCode +  "\"", divCatName);

            // category weight
            //dojo.place("<span style=\"display: flex; justify-content: flex-end\">Weight:&nbsp;</span>", divCatName);
            
            // weight heading
            dojo.place("<span>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<small>Weight</small>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<small>Max Out #</small></span>", divCatName);
            dojo.place("<br/>", divCatName);


            dojo.place("<span>&nbsp;&nbsp;<b>Layer</b>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>", divCatName);


            var selWeight = new Select({
              id: "weight" + dCats[c].CategoryCode,
              options: [
                { label: "10", value: "10", selected: true },
                { label: "9" , value: "9"                  },
                { label: "8" , value: "8"                  },
                { label: "7" , value: "7"                  },
                { label: "6" , value: "6"                  },
                { label: "5" , value: "5"                  },
                { label: "4" , value: "4"                  },
                { label: "3" , value: "3"                  },
                { label: "2" , value: "2"                  },
                { label: "1" , value: "1"                  },
                { label: "0" , value: "0"                  }
              ],
              onChange: function(newValue){
                console.log("weight onChange");
                wR._dirtyQuery();
              }
            }).placeAt(divCatName);


            _layers = dLyrs.filter(o => o['CategoryCode'] == dCats[c].CategoryCode);
            _numlayers = _layers.length;
            // layers heading

            //dojo.place("<hr/>, divCatName);

            var selMaxOut = new Select({
              id: "maxout" + dCats[c].CategoryCode,
              onChange: function(newValue){
                console.log("weight onChange");
                wR._dirtyQuery();
              }
            }).placeAt(divCatName);


            //dojo.place("<hr/>", divCatName)

            for (l in _layers) {
              //dojo.place("<p style=\"display:inline\">&nbsp;&nbsp;</p>", divCatName);
              
              var divToggle = domConstruct.create("div",{id:"toggle" + _layers[l].LayerCode});
  
              divCat.appendChild(divToggle);

              var _checkbox = "<span>&nbsp;&nbsp;&nbsp;&nbsp;<input type=\"checkbox\" id=\"chk" + _layers[l].LayerCode + "\" checked data-dojo-type=\"dijit/form/CheckBox\"> <label for=\"chk" + _layers[l].LayerCode + "\">" + _layers[l].LayerName + "</label></span><br/>";

              dojo.place(_checkbox, divToggle);

//              var checkbox = new CheckBox({
//                name: "checkbox" + _layers[l].LayerCode,
//                label: _layers[l].LayerName,
//                value: "yes",
//                checked: true,
//                onChange: function(newValue){
//                  console.log("Checkbox value: ", newValue);
//                }
//              });
//
//              domConstruct.place(checkbox.domNode, divToggle);
//              checkbox.set("label", "SomeName");
//              
//              var myToggleButton = new ToggleButton({
//                checked: true,
//                iconClass: "dijitCheckBoxIcon",
//                label: _layers[l].LayerName
//              }, divToggle);
//              dojo.place("<br/>", divCatName);
//
//              myToggleButton.domNode.style.color = "green"; // Change the background color to red
//              myToggleButton.domNode.style.border = "0px solid green";
//              //myToggleButton.domNode.style.fontSize = "12px";
//              myToggleButton.domNode.style.borderRadius = "0px";

              selMaxOut.addOption({ value: String(_numlayers - l), label: String(_numlayers - l) }); // add all options at once as an array

              //new Select({
              //  name: "select" + _layers[l].LayerCode,
              //  options: [
              //    { label: "High"   , value: "1.0000", selected: true },
              //    { label: "Medium" , value: "0.6667"                 },
              //    { label: "Low"    , value: "0.3333"                 },
              //    { label: "Exclude", value: "0.0000"                 }
              //  ]
              //}).placeAt(divCatName);
              //dojo.place('<span">&nbsp;' + _layers[l].LayerName + "</span><br/>", divCatName);
            }
            selMaxOut.set("value",Math.min(4,_numlayers))
            selMaxOut.startup();
          }
          
          for (l in dLyrs) {
            dom.byId('chk' + dLyrs[l].LayerCode).onchange = function(){
              wR._dirtyQuery();
            };
          }
          
          wR._dirtyQuery();
        }
        

        //for (var k = 0; k < 2; k++) {
        //  
        //  
        //  for (var l = 0; l < aResultGroup.length; l++) {
        //    if (aGroups[j] == aResultGroup[l] && aCategories[k] == aResultCategories[l]) {
        //        
        //      if (aResultTiers[l] == 1) {
        //        sBGColor="#ED2024";
        //        sFGColor="#FFFFFF";
        //      } else if (aResultTiers[l] == 2) {
        //        sBGColor="#37A949";
        //        sFGColor="#FFFFFF";
        //      } else if (aResultTiers[l] == 3) {
        //        sBGColor="#37C2F1";
        //        sFGColor="#FFFFFF";
        //      } else {
        //        sBGColor="#222222";
        //        sFGColor="#FFFFFF";
        //      }
        //      
        //      var button3 = new Button({ label:aResultRefLabel[l], id:"button_" + aResultRefLabel[l]});
        //      button3.startup();
        //      button3.placeAt(divResults);
        //      button3.on("click", this.ZoomToCorridor);
        //      
        //      dojo.style("button_" + aResultRefLabel[l],"width","40px");
        //      dojo.style("button_" + aResultRefLabel[l],"height","16px");
        //      dojo.style("button_" + aResultRefLabel[l],"background",sBGColor);
        //      dojo.style("button_" + aResultRefLabel[l],"color",sFGColor);
        //      
        //      dojo.place("<div class = \"corridoritem\">&nbsp;&nbsp;" + aResultNames[l] + "</div></br>", "resultssection");
        //      
        //      //dojo.create("div", { id:, innerHTML: "<p>hi</p>" }, "divResults");
        //      
        //      //divResults.innerHTML += "</br>";
        //      
        //    }
        //  }
        //  dojo.place("</br></br></br>", "resultssection");
        //}
        
      },

      _getCatWeights: function() {
        console.log('_getCatWeights');
        var _lstCatWeights = [];
        for (c in dCats) {
          var wd = dom.byId('weight' + dCats[c].CategoryCode);
          _lstCatWeights.push(parseInt(wd.textContent));
        }
        return _lstCatWeights;
      },

      _getCatMaxOuts: function() {
        console.log('_getCatMaxOuts');
        var _lstCatMaxOuts = [];
        for (c in dCats) {
          var wd = dom.byId('maxout' + dCats[c].CategoryCode);
          if (wd.textContent!=='') {
            _lstCatMaxOuts.push(parseInt(wd.textContent));
          } else {
            _lstCatMaxOuts.push(0);
          }
        }
        return _lstCatMaxOuts;
      },

      _getListCheckedLayers: function() {
        console.log('_getListCheckedLayers');
        var _lstCheckedLayers = [];
        for (l in dLyrs) {
          if (dom.byId('chk' + dLyrs[l].LayerCode).checked==true) {
            _lstCheckedLayers.push(dLyrs[l].LayerCode);
          }
        }
        return _lstCheckedLayers;
      },

      _expand: function() {
        console.log('_expand');

        //var myBut = registry.byId("button" + this.id.slice(-2));
        //var divCat = dom.byId("cat" + this.id.slice(-2));
        
        var clickedCat = this.id.slice(-2)

        for (c in dCats) {

          myBut = registry.byId("button" + dCats[c].CategoryCode);
          divCat = dom.byId("cat" + dCats[c].CategoryCode);
          
          if (divCat.style.display=='none' && clickedCat==dCats[c].CategoryCode) {
            divCat.style.display='block';
            myBut.set('label','▼');
          } else {
            divCat.style.display='none';
            myBut.set('label','▶');
          }

        }


        
      }

      // onOpen: function(){
      //   console.log('onOpen');
      // },

      // onClose: function(){
      //   console.log('onClose');
      // },

      // onMinimize: function(){
      //   console.log('onMinimize');
      // },

      // onMaximize: function(){
      //   console.log('onMaximize');
      // },

      // onSignIn: function(credential){
      //   /* jshint unused:false*/
      //   console.log('onSignIn');
      // },

      // onSignOut: function(){
      //   console.log('onSignOut');
      // }

      // onPositionChange: function(){
      //   console.log('onPositionChange');
      // },

      // resize: function(){
      //   console.log('resize');
      // }
    });
  });