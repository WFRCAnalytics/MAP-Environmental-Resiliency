define(['dojo/_base/declare',
        'dojo/dom',
        'jimu/BaseWidget',
        'dijit/form/CheckBox',
        'dojo/html',
        'dojo/domReady!',
        'jimu/LayerInfos/LayerInfos',
        'dijit/form/Select',
        'esri/tasks/query',
        'esri/tasks/QueryTask'],
function(declare, dom, BaseWidget, CheckBox, html, domReady, LayerInfos, Select, Query, QueryTask) {
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

    startup: function() {
        this.inherited(arguments);
        //this.mapIdNode.innerHTML = 'map id:' + this.map.id;
        console.log('startup');
        
        wLS = this;
        this.map.setInfoWindowOnClick(false); // turn off info window (popup) when clicking a feature
        wLS._updateScores();
    },

    _updateScores: function() {
        console.log('_updateScores');

        var query = new Query();  
        query.where = "OBJECTID = " + curParcelPieceUNIQID;
        query.returnGeometry = false;
        query.outFields = ["*"];
        
        var tblqueryTaskArea = new QueryTask(lyrParcelPieces.url);
        tblqueryTaskArea.execute(query,showParcelPieceResults);
        
        //Segment search results
        function showParcelPieceResults(results) {
            console.log('showParcelPieceResults');
      
            var resultCount = results.features.length;
            if (resultCount>0) {
                  //use first feature only
                var featureAttributes = results.features[0].attributes;
  
                if (dCurCommunities.includes(featureAttributes['CommCode'])) {

                    _scoretable = "<table width=\"100%;\"><tr><td><strong>Layer</strong></td><td align=\"right\"><strong>Score</strong></td><td align=\"right\"><strong>Priority</strong><br/><strong>Weight</strong></td><td align=\"right\"><strong>Weighted</strong></br><strong>Score</strong></td></tr>";
                    
                    var _totalweightedscore        = 0;
                    var _totalweightedscore_places = 0;
                    var _totalweightedscore_access = 0;
                    var _totalweightedscore_transp = 0;
                    var _totalweightedscore_necess = 0;

                    var _communitymaxpossible = maxPossible * 10;
                    var _communitymaxpossible_places = maxScore_Places * 10;
                    var _communitymaxpossible_access = maxScore_Access * 10;
                    var _communitymaxpossible_transp = maxScore_Transp * 10;
                    var _communitymaxpossible_necess = maxScore_Necess * 10;

                    for (i=0;i<aCategoryWeights.length;i++) {
                        if (i%2==0) {
                            _shadetext = ' style="background-color:#DDDDDD"';
                        } else {
                            _shadetext ='';
                        }
                        var _score = featureAttributes[aCategories[i]] * 10;
                        var _weight = aCategoryWeights[i];
                        var _weightedscore = _score * _weight;

                        _totalweightedscore += _weightedscore

                        switch (aCategories_Groups[i]) {
                            case 'places':
                                _totalweightedscore_places += _weightedscore; // by definition centers don't overlap, so ok to add since only one should have a value for any given location
                                break;
                            case 'access':
                                _totalweightedscore_access += _weightedscore;
                                break;
                            case 'transp':
                                _totalweightedscore_transp += _weightedscore;
                                break;
                            case 'necess':
                                _totalweightedscore_necess += _weightedscore;
                                break;
                        }

                        _scoretable += "<tr" + _shadetext + ">\
                                        <td>" + aCategories_Names[i] + "</td>\
                                        <td align=\"right\">" + ((_score        .toFixed(1)!='0.0') ? _score        .toFixed(1) : '0'  ) + "</td>\
                                        <td align=\"right\">" + ((_weight       .toFixed(1)!='0.0') ? _weight       .toFixed(2) : 'n/a') + "</td>\
                                        <td align=\"right\">" + ((_weightedscore.toFixed(1)!='0.0') ? _weightedscore.toFixed(1) : '0'  ) + "</td>\
                                        </tr>";
                    }
                    _scoretable += "<tr>\
                                    <td><strong>Total</strong></td>\
                                    <td align=\"right\"></td>\
                                    <td align=\"right\"></td>\
                                    <td align=\"right\"><strong>" + _totalweightedscore.toFixed(1) + "</strong></td>\
                                    </tr>";
                    _scoretable +="</table>"
                    _scoretable += "<tr><td><br/></td></tr>"
                    // subcategories
                    
                    _scoretable +="<table width=\"100%;\"><tr><td><strong>&nbsp;</strong></td><td align=\"right\"><strong>Places</strong></td><td align=\"right\"><strong>Emp.</strong><br/><strong>Access</strong></td><td><strong>Transp.</strong></td><td align=\"center\"><strong>Comm.</strong><br/><strong>Necess.</strong></td><td align=\"center\"><strong>Total</strong></td></tr>";
                    
                    if (dCurCommunities.length==1) {
                        strCommunityText = dCommunities.find(item=>item.value==dCurCommunities[0]).label
                    } else {
                        strCommunityText = "Selected Communities"
                    }

                    _scoretable += "<tr style=\"background-color:#DDDDDD\">\
                                    <td><strong>Total Score for Selected Location</strong></td>\
                                    <td align=\"right\">" + _totalweightedscore_places.toFixed(1) + "</td>\
                                    <td align=\"right\">" + _totalweightedscore_access.toFixed(1) + "</td>\
                                    <td align=\"right\">" + _totalweightedscore_transp.toFixed(1) + "</td>\
                                    <td align=\"right\">" + _totalweightedscore_necess.toFixed(1) + "</td>\
                                    <td align=\"right\"><strong>" + _totalweightedscore.toFixed(1) + "</strong></td>\
                                    </tr>";
                    _scoretable += "<tr>\
                                    <td><strong>Max Possible for " + strCommunityText + "</strong></td>\
                                    <td align=\"right\">" + _communitymaxpossible_places.toFixed(1) + "</td>\
                                    <td align=\"right\">" + _communitymaxpossible_access.toFixed(1) + "</td>\
                                    <td align=\"right\">" + _communitymaxpossible_transp.toFixed(1) + "</td>\
                                    <td align=\"right\">" + _communitymaxpossible_necess.toFixed(1) + "</td>\
                                    <td align=\"right\"><strong>" + _communitymaxpossible.toFixed(1) + "</strong></td>\
                                    </tr>";
                    _scoretable += "<tr style=\"background-color:#DDDDDD\">\
                                    <td><strong>Percent of Max Possible</strong></td>\
                                    <td align=\"right\">" + (_totalweightedscore_places / _communitymaxpossible_places * 100).toFixed(0) + "%</td>\
                                    <td align=\"right\">" + (_totalweightedscore_access / _communitymaxpossible_access * 100).toFixed(0) + "%</td>\
                                    <td align=\"right\">" + (_totalweightedscore_transp / _communitymaxpossible_transp * 100).toFixed(0) + "%</td>\
                                    <td align=\"right\">" + (_totalweightedscore_necess / _communitymaxpossible_necess * 100).toFixed(0) + "%</td>\
                                    <td align=\"right\"><strong>" + (_totalweightedscore / _communitymaxpossible * 100).toFixed(0) + "%</strong></td>\
                                    </tr>";
                    _scoretable += "</table>"
            
                    dom.byId("equation").innerHTML = _scoretable;
                } else {
                    dom.byId("equation").innerHTML = 'Location is outside of selected communities.';
                }
            } else {
                dom.byId("equation").innerHTML = 'No location selected.';
            }
        }
    },
    
    //Run onOpen when receiving a message from OremLayerSymbology
    onReceiveData: function(name, widgetId, data, historyData) {
        //filter out messages
        if(name !== 'Housing'){
            return;
        } else{
            wLS._updateScores();
        }
    },

    // onOpen: function(){
    //   console.log('onOpen');
    // },

    onClose: function(){
        console.log('onClose');

        wLS.publishData({
            message: "remove_location"
      });

    },

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