var customTable = customTable || {};

customTable._tables = [];
customTable._tablesAltIndexes = [];
customTable._ajaxRequest = null;
customTable._ajaxCallbackFunction = null;
customTable.mouseX = 0;
customTable.mouseY = 0;
customTable._filterValues = [];
customTable._currentSortIndex = 0;
customTable._currentEdit = null;
customTable._currentEditRowIndex = null;
customTable._currentEditCellIndex = null;
customTable._currentEditTableName = null;

customTable.retrieveTable = function(name){
	var result = null;
	for (var i = 0; i < customTable._tables.length; i++) {
		if (customTable._tables[i].getTableName() == name) {
			result = customTable._tables[i];
			break;
		}
	}
	return result;
};

customTable._findAlternateIndex = function(tableName){
	var foundIndex = null;
	for (var i = 0; i < customTable._tablesAltIndexes.length; i++) {
		if (customTable._tablesAltIndexes[i].name == tableName) {
			foundIndex = customTable._tablesAltIndexes[i];
			break;
		}
	}
	return foundIndex;
};

customTable.initTable = function(name, dataCols, parentContainer, usePixelsForWidth, saveCallback)  {
	var newTable = new customTable._customTableDefinition(name, dataCols, parentContainer, usePixelsForWidth, saveCallback);
	customTable._tables.push(newTable);
	return newTable;
};

customTable._customTableDefinition = function(name, dataCols, parentContainer, usePixelsForWidth, saveCallback) {
    var _usePixels = usePixelsForWidth,
		_tableName = name,
        _dataColumns = dataCols,
        _tableRows = [],
        _tableHeaders = [],
		_tableWidths = [],
		_parentContainer = parentContainer,
		_scrolling = false,
		_unsortedIndex = {},
		_currentIndex = {},
		_dataSource = null,
		_childRows = [],
		_editedData = [],
		_saveCallback = saveCallback,
	
	execSaveCallback = function() {
		var result = false;
		if (_editedData.length > 0) {
			if (typeof(_saveCallback) == 'function')
				result = _saveCallback(_editedData);
			else result = true;
		}
		else result = true;
		if (result) _editedData = [];
		return result;
	},
	
	getEditedRows = function() {
		return _editedData;
	},
	
    getDataColumns = function() {
        return _dataColumns;
    },
        
    getTableRows = function(indexes) {
		if (indexes == null || indexes == 'undefined') return _tableRows;
		else {
			var result = [];
			for (var i = 0; i < indexes.length; i++) {
				result.push(_tableRows[indexes[i]]);
			}
			return result;
		}
    },

	loadAndFill = function(json) {
		loadTable(json);
		fillParent();
	},
    
    loadTable = function(json) {
		_unsortedIndex.indexes = [];
		var alt ={};
		
		alt.name = _tableName;
		alt.indexes = [];
		
		_dataSource = JSON.parse(json);
		var scrollBarOffset = 0;
		var totalWidths = 0;
		if (_dataSource.length * 20 > document.body.clientHeight) {
			scrollBarOffset = 15;
			_scrolling = true;
		}
		
		var parentWidth = 100;
		
		if (_parentContainer != null && _parentContainer != 'undefined') {
			_parentContainer.style.whiteSpace="nowrap";
			parentWidth = _parentContainer.getBoundingClientRect().width - scrollBarOffset;
		}
		var equalColumn = Math.floor(parentWidth / _dataColumns.length);
		var equalPercentage = Math.floor(100/_dataColumns.length);
		var width = 0;
		
		for (var y = 0; y < _dataColumns.length; y++) {
			customTable._filterValues.push({op:"",val:""});
			var index = {};
			index.name = _dataColumns[y].field;
			index.currentSort = 0;
			index.values = [];
			alt.indexes.push(index);
            if (_dataColumns[y].title != null && _dataColumns[y].title != 'undefined' && _dataColumns[y].title != "")
                _tableHeaders.push(_dataColumns[y].title);
            else _tableHeaders.push(customTable.spaceWords(_dataColumns[y].field));
			
			if (_dataColumns[y].visible == null || _dataColumns[y].visible == 'undefined' || _dataColumns[y].visible)
				_dataColumns[y].visible = true;
				
			if (_dataColumns[y].width != null && _dataColumns[y].width != 'undefined' && _dataColumns[y].width != "") {
				width = _dataColumns[y].width;
				_tableWidths.push(width);
				totalWidths += parseInt(width);
			}
			else {
				if (_usePixels) {
					width = equalColumn;
					if (y == _dataColumns.length - 1) {
						width += parentWidth - (totalWidths + width + 1)
					}
					_tableWidths.push(width.toString() + 'px');
					totalWidths += width;
				}
				else _tableWidths.push(equalPercentage.toString() + '%');
			}
        }
		
		var unsorted = [];
		var masterCount = -99;
        for (var i = 0; i < _dataSource.length; i++) {
			masterCount+=100;
			unsorted.push({index:i});
            var t = buildRow(masterCount,i,"\"",alt);
            if (t != "") _tableRows.push(t);
        }
		
		_unsortedIndex.indexes.push(unsorted);
		_currentIndex = _unsortedIndex;
		
		for (var z = 0; z < alt.indexes.length; z++){
			alt.indexes[z].values.sort(function (a, b) {
                return customTable.sortMultiDimensionalArray(a, b, 'value');
            });
		}
		customTable._tablesAltIndexes.push(alt);
    },
    
	rebuildRow = function(row,cell,val){
		var foundEdited = null;
		for (var z = 0; z < _editedData.length; z++) {
			if (_editedData[z].index == row) {
				foundEdited = _editedData[z];
				break;
			}
		}
		_dataSource[row][cell] = val;
		if (foundEdited == null) {
			foundEdited = _dataSource[row];
			foundEdited.index = row;
			_editedData.push(foundEdited);
		}
		else foundEdited[cell] = val;
		_tableRows[row] = buildRow(_dataSource[row].masterCount,row,"\"",null);
		var alt = customTable._findAlternateIndex(getTableName());
		for (var i = 0; i < _dataColumns.length; i++) {
			if (_dataColumns[i].field == cell) {
				for (var x = 0; x < alt.indexes[i].length; x++) {
					if (alt.indexes[i][x].index == row) {
						alt.indexes[i][x].value = val;
						break;
					}
				}
				break;
			}
		}
	},
	
	buildRow = function(masterCount,i,keyType,alt) {
		_dataSource[i].masterCount = masterCount;
		var t = "";
		for (var x = 0; x < _dataColumns.length; x++) {
			var visible = "display:none;";
			if (_dataColumns[x].visible == null || _dataColumns[x].visible == 'undefined' || _dataColumns[x].visible)
				visible = "";
			
			var val = _dataSource[i][_dataColumns[x].field];
			if (val == null || val == 'undefined' || val == "") val = "";
			switch (_dataColumns[x].dataType) {
				case "int":
					val = parseInt(val);
					keyType = "";
					break;
				case "float":
					val = parseFloat(val);
					keyType = "";
					break;
			} 
			if (_dataColumns[x].editType == null || _dataColumns[x].editType == 'undefined') _dataColumns[x].editType = '0';
			_dataColumns[x].editType == _dataColumns[x].editType.toString();
			var edit = "";
			if (parseInt(_dataColumns[x].editType) > 0) {
				edit = "<span class='ct-edit-cell' onclick='customTable.editCell(this.parentNode.parentNode," + i.toString() + ",\"" + _dataColumns[x].field + "\",\"" + getTableName() + "\");'>&para;</span>";
			}
			var childInd = "";
			var hasChildren = "0";
			if (_dataColumns[x].child != null && _dataColumns[x].child != 'undefined') {
				childInd = "<span class='ct-div-row-expand' onclick='customTable.showChildren(this,\"" + _tableName + "\"," + keyType + val + keyType + ",\"" + _dataColumns[x].child + "\",\"" + _dataColumns[x].childKey + "\");'>+</span>";
				hasChildren="1";
			}
			if (alt != null) alt.indexes[x].values.push({value: val, index: i});
			if (visible == "")
				t += "<div ctrow='" + i.toString() + "' ctchild='" + hasChildren + "' ctedit='" + _dataColumns[x].editType + "' tabindex='" + masterCount.toString() + "' name='" + _dataColumns[x].field + "' style='" + visible + "min-width:" + _tableWidths[x] + ";width:" + _tableWidths[x] + ";max-width:" + _tableWidths[x] + ";' class='ct-div-cell' onfocus='customTable.cancelEdit();'><span >" + childInd + edit + "<span>" + val + "</span></span></div>";
			masterCount++;
		}
		return t;
	},
	
	getTableName = function() {
	    return _tableName;
	},
	
	returnParent = function() {
		return _parentContainer;
	},
        
	fillParent = function (p) {
		if (p == null) p = _parentContainer;
		
		if (p != null && p != 'undefined') p.innerHTML = returnAsHtml(_unsortedIndex.indexes[0]);
		
		customTable.addEvent(_parentContainer,'keyup',function(e) {
			switch(e.keyCode) {
				case 69:
					if (e.altKey && e.ctrlKey && e.shiftKey) {
						var ce = document.activeElement;
						if (ce.getAttribute("ctedit") != null && ce.getAttribute('ctedit') != 'undefined') {
							customTable.editCell(ce,ce.getAttribute("ctrow"),ce.getAttribute("name"),getTableName());
						}
					}
					break;
				case 88:
					if (e.altKey && e.ctrlKey && e.shiftKey) {
						var cx = document.activeElement;
						if (cx.getAttribute("ctchild") == "1") {
							cx.childNodes[0].childNodes[0].click();
						}
					}
					break;
				case 83:
					if (e.altKey && e.ctrlKey && e.shiftKey) {
						customTable.saveEdits(getTableName());
					}
					break;
				default:
					break;
			}
		}
		);
	},
	
	filterByColumn = function (altIndex,operator,value) {
		switch (_dataColumns[altIndex].dataType) {
			case "int":
				value = parseInt(value);
				break;
			case "float":
				value = parseFloat(value);
				break;
		}
		var foundIndex = customTable._findAlternateIndex(_tableName);
		
		var index = [];
		var tindex = foundIndex.indexes[altIndex].values;
		for (var i = 0; i < tindex.length; i++){
			for (var b = 0; b < _currentIndex.indexes[0].length; b++) {
				if (tindex[i].index == _currentIndex.indexes[0][b].index) {
					index.push(tindex[i]);
					break;
				}
			}
		}
				
		var indexes = [];
		var result = {};
		
		result.indexes = [];
		result.indexes.push([]);
		
		switch (operator) {
			case "=":
				indexes = customTable.getAllIndexesNonUniqueAlternate(value, index, 'value', 'index');
				for (var a = 0; a < indexes.length; a++) {
					result.indexes[0].push({index: indexes[a]});
				}
				break;
			case "<":
				var firstFound = customTable.getValueOfSortedArray(value, index, 'value');
				for (var d = firstFound; d > -1; d++) {
					if (_currentIndex.indexes[0][d].value != value) {
						firstFound = d;
						break;
					}
				}
				for (var c = 0; c < firstFound; c++) {
					result.indexes[0].push(_currentIndex.indexes[0][c]);
				}
				break;
			case ">":
				break;
			case "<=":
				break;
			case ">=":
				break;
			case "%":
				break;
			default:
				for (var z = 0; z < _unsortedIndex.indexes[0].length; z++) {
					result.indexes[0].push({index: _unsortedIndex.indexes[0][z].index});
				}
				break;
		}
		
		_currentIndex = result;
		foundIndex.indexes[customTable._currentSortIndex].currentSort--;
		sortByColumn(customTable._currentSortIndex);
	},
	
	sortByColumn = function(altIndex) {
		customTable._currentSortIndex = altIndex;
		var foundIndex = customTable._findAlternateIndex(_tableName);
		foundIndex.indexes[altIndex].currentSort++;
		if (foundIndex.indexes[altIndex].currentSort > 2) foundIndex.indexes[altIndex].currentSort = 0;
		
		var index = _currentIndex.indexes[0];
		var start = 0;
		var end = _currentIndex.indexes[0].length;
		var arrow = "";
		switch (foundIndex.indexes[altIndex].currentSort) {
			case 1:
				arrow = "&uarr;";
				index = [];
				var tindex = foundIndex.indexes[altIndex].values;
				for (var i = 0; i < tindex.length; i++){
					for (var b = 0; b < _currentIndex.indexes[0].length; b++) {
						if (tindex[i].index == _currentIndex.indexes[0][b].index) {
							index.push(tindex[i]);
							break;
						}
					}
				}
				start = 0;
				end = index.length;
				break;
			case 2:
				arrow = "&darr;";
				index = [];
				var tindex = foundIndex.indexes[altIndex].values;
				for (var i = 0; i < tindex.length; i++){
					for (var b = 0; b < _currentIndex.indexes[0].length; b++) {
						if (tindex[i].index == _currentIndex.indexes[0][b].index) {
							index.push(tindex[i]);
							break;
						}
					}
				}
				end = -1;
				start = index.length-1;
				break;
		}
		rebuildBody(index, start, end);
		
		var headerCells = document.getElementsByClassName('ct-header-sort');
		
		for (var i = 0; i < headerCells.length; i++) {
			headerCells[i].innerHTML = "";
		}
		
		headerCells = document.getElementsByName('sortInd' + altIndex.toString());
		
		for (var i = 0; i < headerCells.length; i++) {
			headerCells[i].innerHTML = arrow;
		}
	},
	
	returnAsHtml = function (index) {
		var result = "";
		var header = buildHeader(true);
		result += header + "<div id='_" + _tableName + "tableBody'>";
		
	    result += _buildBody(index, 0, index.length);
		
		result += "</div>";
		if (_scrolling) {
			result += "<div class='ct-back-to-top'><a onclick='window.scrollTo(0,0);'>Back to top</a></div>";
			result += "<div id='customTableFloatingHeader' class='ct-div-header-row ct-div-floating-header-row' style='display:none;left:" + _parentContainer.getBoundingClientRect().left + "px;'>" + header + "</div>";
			result += "<div id='customTableColFilter' class='ct-col-filter' style='display:none;' ctName='" + _tableName + "'><div>filter all values that are:</div><select id='customTableFilterOperator'><option value='='>=</option><option value='<'>&lt;</option></select><input id='customTableFilterValue' type='text' /><input type='button' value='apply' onclick='customTable.applyFilter(true);' /><input type='button' value='clear all' onclick='customTable.applyFilter(false);' /><input type='button' value='cancel' onclick='customTable.cancelFilter();'/></div>";
			result += "<span id='floatingEdit'><input type='text' id='floatingEditText' /><input type='button' value='ok' onclick='customTable.applyEdit();' /><input type='button' value='cancel' onclick='customTable.cancelEdit();' /></span>";
			result += "<div class='ct-save'><a onclick='customTable.saveEdits(\"" + getTableName() + "\");'>Save</a></div>";
			customTable.addEvent(window,"scroll",function(){
				var tableTop = _parentContainer.getBoundingClientRect().top;
				if (document.body.scrollTop > tableTop) {
					document.getElementById("customTableFloatingHeader").style.display="block";
				} else {
					document.getElementById("customTableFloatingHeader").style.display="none";
				}
			});
			
			customTable.addEvent(document,'mousemove', customTable.getMouseXY);
		}
	    return result;
	},
	
	buildHeader = function(main) {
		var header1 = "<div class='ct-div-header-row'>";
	    
		var header = "";
		
	    for (var x = 0; x < _tableHeaders.length; x++){
			if (_dataColumns[x].visible) {
				header += "<div name='" + _dataColumns[x].field + "' style='width:" + _tableWidths[x] + ";min-width:" + _tableWidths[x] + ";' class='ct-div-header-cell'>";
				if (main) {
					header += "<a name='filter" + x.toString() + "' class='ct-header-filter' onclick='customTable.showFilter(this," + x.toString() + ");'>&Upsilon;</a><a class='ct-header-sort' name='sortInd" + x.toString() + "'></a><a onclick='customTable.sortGrid(\"" + _tableName + "\"," + x.toString() + ");' class='ct-div-header-cell-name'>";
					header += _tableHeaders[x] + "</a>";
				}
				else {
					header += _tableHeaders[x];
				}
				header += "</div>";
			}
		}

	    header += "</div>";
		
		return header1 + header;
	},
	
	rebuildBody = function(index, start, end) {
		_parentContainer.children[1].innerHTML = _buildBody(index, start, end);
	},
	
	_buildBody = function(index, start, end) {
		var result = "";
		if (start < end) {
			for (var i = start; i < end; i++) {
				var alt = "ct-div-row";
				if (i % 2 == 0) alt += " ct-div-row-alt";
				result += "<div style='display:table-row;' class='" + alt + "'>" + _tableRows[index[i].index] + "</div>";
			}
		}
		else {
			for (var i = start; i > end; i--) {
				var alt = "ct-div-row";
				if (i % 2 == 0) alt += " ct-div-row-alt";
				result += "<div style='display:table-row;' class='" + alt + "'>" + _tableRows[index[i].index] + "</div>";
			}
		}
		
		return result;
	};

	return {
	    getTableName: getTableName,
	    loadTable: loadTable,
	    getTableRows: getTableRows,
	    getDataColumns: getDataColumns,
	    returnAsHtml: returnAsHtml,
		returnParent: returnParent,
		fillParent: fillParent,
		loadAndFill: loadAndFill,
		rebuildBody: rebuildBody,
		sortByColumn: sortByColumn,
		filterByColumn: filterByColumn,
		buildHeader: buildHeader,
		rebuildRow: rebuildRow,
		getEditedRows: getEditedRows,
		execSaveCallback: execSaveCallback
	};
};

customTable.saveEdits = function(table) {
	var t = customTable.retrieveTable(table);
	var e = t.execSaveCallback();
	var tBody = document.getElementById('_' + table + 'tableBody');
	var saved = false;
	if (e){
		saved = true;
	}
	
	if (saved) {
		var ec = tBody.getElementsByClassName('ct-edited-cell');
		for (var i = ec.length - 1; i > -1; i--) {
			ec[i].parentNode.removeChild(ec[i]);
		}
	} else {
		alert('edited data not saved');
	}
};

customTable.applyEdit = function() {
	if (customTable._currentEdit == null || customTable._currentEdit == 'undefined') return;
	if (customTable._currentEditRowIndex == null || customTable._currentEditRowIndex == 'undefined') return;
	if (customTable._currentEditCellIndex == null || customTable._currentEditCellIndex == 'undefined') return;
	if (customTable._currentEditTableName == null || customTable._currentEditTableName == 'undefined') return;
	var val = document.getElementById('floatingEditText').value;
	table.rebuildRow(customTable._currentEditRowIndex, customTable._currentEditCellIndex, val);
	customTable._currentEdit.innerHTML = "<span class='ct-edited-cell'>&diams;</span>" + val;
	customTable.closeEdit();
};

customTable.cancelEdit = function() {
	if (customTable._currentEdit == null || customTable._currentEdit == 'undefined') return;
	document.getElementById('floatingEditText').value = customTable._currentEdit.innerHTML;
	customTable.closeEdit();
};

customTable.closeEdit = function() {
	document.getElementById('floatingEdit').style.display = 'none';
	customTable._currentEdit.style.display = 'inline';
	customTable._currentEdit.parentNode.parentNode.focus();
	customTable._currentEdit = null;
};

customTable.editCell = function(ce,row,cell,table1) {
	if (customTable._currentEdit != null) customTable._currentEdit.style.display = 'inline';
	switch (ce.getAttribute("ctedit")) {
		case "1":
			var t = document.getElementById('floatingEdit');
			var span = ce.childNodes[0].childNodes[ce.childNodes[0].childNodes.length-1];
			t.style.left = span.getBoundingClientRect().left;
			t.style.top = span.getBoundingClientRect().top;
			t.style.display = "inline";
			t.childNodes[0].setAttribute('tabindex',ce.getAttribute('tabindex'));
			t.childNodes[1].setAttribute('tabindex',ce.getAttribute('tabindex'));
			t.childNodes[2].setAttribute('tabindex',ce.getAttribute('tabindex'));
			t.childNodes[0].value = span.innerHTML;
			t.childNodes[0].focus();
			span.style.display = "none";
			customTable._currentEdit = span;
			customTable._currentEditRowIndex = row;
			customTable._currentEditCellIndex = cell;
			customTable._currentEditTableName = table1;
			break;
		case "0":
		default:
			break;
	}
};

customTable.showChildren = function (row,parentTable,parentKeyValue,child,childKey) {
	if (row.innerHTML == "+") {
		var childTable = customTable.retrieveTable(child);
		var childIndexes = customTable._findAlternateIndex(child);
		var childIndex = null;
		for (var i = 0; i < childIndexes.indexes.length; i++){
			if (childIndexes.indexes[i].name == childKey) {
				childIndex = childIndexes.indexes[i];
				break;
			}
		}
		if (childIndex != null && childIndex != 'undefined') {
			var childRowIndexes = customTable.getAllIndexesNonUniqueAlternate(parentKeyValue,childIndex.values,"value","index");
			var childRows = childTable.getTableRows(childRowIndexes)
			if (childRows.length > 0) {
				var newTableRow = document.createElement("div");
				newTableRow.className='ct-div-child-row';
				newTableRow.style.display="table";
				newTableRow.style.width = (parseFloat(row.parentNode.parentNode.parentNode.getBoundingClientRect().width) - 50.0).toString() + 'px';
				var headerRow = document.createElement("div");
				headerRow.className = "ct-div-header-row";
				var header = childTable.buildHeader(false);
				headerRow.innerHTML = header.substring(31,header.length-6);
				newTableRow.appendChild(headerRow);
				for (var x = 0; x < childRows.length; x++) {			
					var newRow = document.createElement("div");
					newRow.className = "ct-div-row";
					newRow.style.display = "table-row";
					newRow.innerHTML = childRows[x];
					newRow.setAttribute("tabindex","");
					newTableRow.appendChild(newRow);
					customTable._insertNodeAfter(row.parentNode.parentNode.parentNode.parentNode,newTableRow,row.parentNode.parentNode.parentNode);
					var nextIndex = parseInt(row.parentNode.parentNode.parentNode.childNodes[row.parentNode.parentNode.parentNode.childNodes.length-1].getAttribute("tabindex")) + 1;
					for (var z = 0; z < newTableRow.childNodes[1].childNodes.length; z++) {
						newTableRow.childNodes[1].childNodes[z].setAttribute('tabindex',nextIndex.toString());
						nextIndex++;
					}
				}				
				row.innerHTML = "-";
			}
		}
	} else if (row.innerHTML == "-") {
		row.parentNode.parentNode.parentNode.parentNode.removeChild(row.parentNode.parentNode.parentNode.nextSibling);
		row.innerHTML = "+";
	}
};

customTable.showFilter = function(ele,index) {
	var filter = document.getElementById('customTableColFilter');
	filter.setAttribute('ctIndex',index);
	var coords = ele.getBoundingClientRect()
	filter.style.left = coords.left;
	filter.style.top = coords.bottom;
	document.getElementById('customTableFilterValue').value = customTable._filterValues[index].val;
	filter.style.display = 'block';
	document.getElementById('customTableFilterValue').focus();
	customTable._openFilter = ele;
};

customTable.cancelFilter = function(){
	customTable._openFilter = null;
	customTable.hideFilter();
};

customTable.hideFilter = function() {
	document.getElementById('customTableColFilter').style.display = "none";
};

customTable.applyFilter = function(apply){
	var filter = document.getElementById('customTableColFilter');
	var e = document.getElementById('customTableFilterOperator');
	var op = "";
	var val = "";
	
	if (apply) {
		op = e.options[e.selectedIndex].value;
		val = document.getElementById('customTableFilterValue').value;
		if (customTable._openFilter != null){
			var fs = document.getElementsByName(customTable._openFilter.getAttribute("name"));
			for (var x = 0; x < fs.length; x++)
				fs[x].className = "ct-header-filter ct-header-filter-applied";
		}
	} else {
		var filters = document.getElementsByClassName('ct-header-filter');
		for (var i = 0; i < filters.length; i++)
			filters[i].className = "ct-header-filter";
	}
	customTable.filterGrid(filter.getAttribute('ctName'), filter.getAttribute('ctIndex'), op, val);
	customTable.hideFilter();
};

customTable.sortGrid = function(name,index){
	var table = customTable.retrieveTable(name);
	if (table != null && table != 'undefined') table.sortByColumn(index);
};

customTable.filterGrid = function(name,index,operator,value){
	var table = customTable.retrieveTable(name);
	if (table != null && table != 'undefined') {
		customTable._filterValues[index].op = operator;
		customTable._filterValues[index].val = value;
		table.filterByColumn(index,operator,value);
	}
};

customTable.existsInSortedArray = function (searchElement, array) {
    if (customTable.getValueOfSortedArray(searchElement, array) > -1) return true;
    return false;
};

customTable.getValueOfSortedArray = function (searchElement, array, prop, propReturn) {
    var minIndex = 0;
    var maxIndex = array.length - 1;
    var currentIndex;
    var currentElement;

    if (prop == null || prop == 'undefined') prop = "";
    if (propReturn == null || propReturn == 'undefined') propReturn = "";

    while (minIndex <= maxIndex) {
        currentIndex = (minIndex + maxIndex) >> 1 | 0;
        if (prop == "") currentElement = array[currentIndex];
        else currentElement = array[currentIndex][prop].toString();
        if (currentElement < searchElement) {
            minIndex = currentIndex + 1;
        } else if (currentElement > searchElement) {
            maxIndex = currentIndex - 1;
        } else {
            if (propReturn == "") return currentIndex;
            return array[currentIndex][propReturn];
        }
    }

    return -1;
};

customTable.getAllIndexesNonUniqueAlternate = function (searchElement, array, prop, propReturn) {
    var result = [];
    var startIndex = customTable.getValueOfSortedArray(searchElement, array, prop);
	if (startIndex < 0) return result;
    if (propReturn != "") result.push(array[startIndex][propReturn]);
    else result.push(startIndex);
    var count = startIndex;
    if (startIndex > 0) {
        count--;
        while (count >= 0) {
            if (prop != "" && array[count][prop] == searchElement) {
                if (propReturn != "") result.push(array[count][propReturn]);
                else result.push(count);
            } else if (array[count] == searchElement) {
                if (propReturn != "") result.push(array[count][propReturn]);
                else result.push(count);
            } else count = -1;

            count--;
        }
    }
    count = startIndex;
    if (startIndex < array.length) {
        count++;
        while (count < array.length) {
            if (prop != "" && array[count][prop] == searchElement) {
                if (propReturn != "") result.push(array[count][propReturn]);
                else result.push(count);
            } else if (array[count] == searchElement) {
                if (propReturn != "") result.push(array[count][propReturn]);
                else result.push(count);
            } else count = array.length;

            count++;
        }
    }

    return result.sort();
};

customTable.sortMultiDimensionalArray = function (a, b, prop) {
    if (prop == null || prop == 'undefined') {
        if (a < b) return -1;
        else if (a > b) return 1;
    } else {
        if (a[prop] < b[prop]) return -1;
        else if (a[prop] > b[prop]) return 1;
    }
    return 0;
};

customTable.getMouseXY = function(e) {
	var IE = document.all ? true : false;
	if (IE) {// grab the x-y pos.s if browser is IE
		customTable.mouseX = event.clientX + document.body.scrollLeft;
		customTable.mouseY = event.clientY + document.body.scrollTop;
	} else {// grab the x-y pos.s if browser is NS
		customTable.mouseX = e.pageX;
		customTable.mouseY = e.pageY;
	}
	if (customTable.mouseX < 0) {
		customTable.mouseX = 0;
	}
	if (customTable.mouseY < 0) {
		customTable.mouseY = 0;
	}
	return true;
};
			
customTable.spaceWords = function (word) {
	var result = "";
	var start = 0;
	for (var x = 0; x < word.length; x++) {
		if (word[x] == word[x].toUpperCase()) {
			result += " " + word.substring(start,x);
			start = x;
		}
	}
	
	if (start > 0) result += " " + word.substring(start);
	else result = word;
	
	return result;
};

customTable.callAJAX = function (url, action, callback) {
    customTable._ajaxCallbackFunction = callback;
	customTable._createAJAXRequest();
	customTable._ajaxRequest.onreadystatechange = customTable._ajaxCallback;
	customTable._ajaxRequest.open(action, url, true);
	customTable._ajaxRequest.send(null);
};

customTable._ajaxCallback = function () {
	if (customTable._ajaxRequest.readyState == 4) {
	    if (customTable._ajaxRequest.status == 200) {
	        if (customTable._ajaxCallbackFunction != null && customTable._ajaxCallbackFunction != 'undefined')
	            customTable._ajaxCallbackFunction(customTable._ajaxRequest.responseText);
	        else console.log(customTable._ajaxRequest.responseText);
		} else {
			console.log('error getting AJAX');
		}
	}
};

customTable._createAJAXRequest = function() {
	try {
		customTable._ajaxRequest = new XMLHttpRequest();
	} catch (tryMS) {
		try {
			customTable._ajaxRequest = new ActiveXObject("Msxml2.XMLHTTP");
		} catch (otherMS) {
			try {
				customTable._ajaxRequest = new ActiveXObject("Microsoft.XMLHTTP");
			} catch (failed) {
				customTable._ajaxRequest = null;
			}
		}
	}
	
	return customTable._ajaxRequest;
};

customTable.addEvent = function(elem, type, eventHandle) {
    if (elem == null || elem == undefined) return;
    if ( elem.addEventListener ) {
        elem.addEventListener( type, eventHandle, false );
    } else if ( elem.attachEvent ) {
        elem.attachEvent( "on" + type, eventHandle );
    } else {
        elem["on"+type]=eventHandle;
    }
};

customTable._insertNodeAfter = function (parentNode, newNode, afterNode) {
	parentNode.insertBefore(newNode, afterNode.nextSibling);
};