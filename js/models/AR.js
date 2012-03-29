//the async api suuuuuuuuuuuuucks ass!
//This orm is totally crap!! DO I need to rewrite it from scrath?

Models = {

};


//tblInfo:{
//  tableName:tableName,
//  modelName:modelName,
//  type:dictHw / dictIdx etc,
//  id: num
//	fields{
//      col1:[TYPE,NOTNULL,UNIQUE,PRIMARY_KEY],
//      ...
// },
//  relations{
//      relName:{
//          type:HAS_MANY/...,
//          refModel:ForeignModelName,
//          keyMatch:{ownField:refField,..},
//          prefetch:true
//      },
//      ...
// }
//}

//TODO: deal with sql injection?? NO need the [...] thing should take care of that !
// AR is the entity, Table is the table schema, Transaction is the transaction for the table.
//var AR,ArTransaction,ArTable;

(function(){



	//values and Types
	{
		var _types = {
			TEXT   : 'TEXT',
			BLOB   : 'BLOB',
			INTEGER: 'INTEGER',
			REAL   : 'REAL',
			Boolean: 'BOOLEAN'
		};
		var _conversions = {
			TEXT   : String,
			BLOB   : String,
			INTEGER: function(str){return parseInt(str, 10)},
			REAL   : Number,
			BOOLEAN: Boolean
		};
		var _constraints = {
			UNIQUE       : 'UNIQUE',
			PRIMARY_KEY  : 'PRIMARY KEY',
			NOT_NULL     : 'NOT NULL',
			AUTOINCREMENT: 'AUTOINCREMENT'
		};

		var _relations = {
			HAS_MANY  : "HAS MANY",
			HAS_ONE   : "HAS ONE",
			BELONGS_TO: "BELONGS TO"
		};
	}

	//ctor
	AR = function(row){
		this._rowDB = row || {};
		this._rowMem = {};
		if(this._table.relations)
			this._rels = {};
	};
	/**
	 * @type Database
	 */
	AR.db = null;
	AR.openDB = function(dbname, ver, desc, size){
		AR.db = openDatabase(dbname, ver, desc || '', size || (100 * 1024 * 1024));
	};

	///*** CLASS - Command ***/
	{
		ArCommand = function(table){
			this.table = table;
			this.sql = '';
		};
		ArCommand.prototype = {

		}

	}

	///*** CLASS - Transaction ***/
	{
		ArTransaction = function(tbl, tx, display){
			this.table = tbl;
			if(tx)
			{
				this.sync = true;
				this.tx = tx;
			}
			this.display = display;
			this.commands = [];

		}


		//>8( THE stupid IDE only recognizes global classes, thus the awekward prefixes
		ArTransaction.prototype = {
			check: function(cb){
				var exists = true;
				var me = this;
				if(!this.table.ready)
				{

					this.addSqlCommand(
						this.table._checkSql,
						[],
						function(tx,rs){
							if(cb)cb(true);
						},
						function(tx, e){
						if(e.message.indexOf("no such table"))
							{
								exists = false;
							}
							else
							{
								me.table.ready = true;
							}
							if(cb)
								cb(exists,me.table,exists? null: function(){me.table.ready = true});
					});
				}
				else
					if(cb)cb(exists);

				return this;
			},

			addProgressListener: function(cb){
				this.progressCb = cb;
				return this;
			},

			exec: function(sql, params, cb, errHander){
				if(this.display)
				{
					console.log(sql, params);
				}
				else
				{
					this.tx.executeSql(sql, params, cb, errHander || function(tx,e){console.log(e, sql)});
				}
			},

			addCommand: function(cmd){
				this.commands.push(cmd);
				return this;
			},

			addSqlCommand: function(sql, params, cb, errHandler){
				return this.addCommand(this.makeSqlCommand(sql, params, cb, errHandler));
			},

			makeSqlCommand: function(sql, params, cb, errHandler){
				var me = this;
				return function(){me.exec(sql, params, cb, errHandler)};
			},

			runCommands: function(){
				var cmd;
				//            var cnt = this.commands.length
				//                ,step = Math.ceil(cnt/100)
				//                ,done = 0
				//                ;
				while(cmd = this.commands.shift())
				{
					cmd();
					//                //trigger progress event
					//                if(this.progressCb && ++done%step == 0)
					//                    this.progressCb({total:cnt,progress:done});
				}
				if(this.toFetch)
				{
					var me = this;
					Object.keys(this.toFetch).forEach(function(k){
						me.toFetch[k].transaction.commit();
					});
				}
				return this;
			},

			getResults: function(cb){
				var rs = this.results;
//				if(rs && rs.length == 1)
//				{
//					rs = rs[0];
//				}
				if(cb)cb(rs);
			},

			commit: function(cb){
				if(!this.sync)
				{
					var me = this;
					AR.db.transaction(
						function(tx){
							me.tx = tx; //set transaction here!!
							me.runCommands();
						},
						function(e){
							console.log(e);
						},
						function(tx){
							me.getResults(cb);
						}
					);
				}
				else //use transaction from other table
				{
					this.runCommands();
					this.getResults(cb);
				}
			},

			drop: function(cb){
				return this.addSqlCommand(this.table._dropSql, [], cb);
			},

			create: function(cb){
				return this.addSqlCommand(this.table._createSql, [], cb);
			},

			insert: function(params, cb){
				return this.addSqlCommand(this.table._insertSql, params, cb);
			},

			/**
			 *
			 * @param {String} csv
			 * @param {String} sep
			 */
			importCsv: function(csv, sep, cb){
				if(!csv)
				{
					var eMsg = 'Empty csv!'+this.table.tableName;
					alert(eMsg);
					throw eMsg;
				}
				sep = sep || this.table.separator|| ',';
				var lineRe = /^.+$/mg;
				var fields = this.table.fields;
				var converters = Object.keys(fields).map(function(fName){
					var f = fields[fName];
					return function(fld){
						return (!fld && f.nullable )? null: f.convert(fld);
					};
				});
				var me = this;
				return this.addCommand(function(){
					var total = me.table.totalRecs;
					var step = Math.ceil(total / 100);
					var match, count = 0;
					while(match = lineRe.exec(csv))
					{
						var line = match[0]
							.split(sep)
							.map(function(fld, idx){return converters[idx](fld)});
						me.exec(me.table._insertSql, line);
						count++;
						if(total && me.progressCb && (count % step == 0 || count >= total))
						{
							me.progressCb({total: total, progress: count});
						}
					}
					if(cb)cb(count);

				});

			},
			directFind: function(cond,params,cb){
				var me = this;
				var sql = me.table._selectSql + cond +  "LIMIT 1";
				me.exec(sql,params,function(tx,rs){
					var res = rs.rows.length? new me.table(rs.rows.item(0)):null;
					cb(res);
				})
			},
			directFindAll: function(cond,params,cb){
				var me = this;
				var sql = me.table._selectSql + cond;
				me.exec(sql,params,function(tx,rs){
					var res = [], l =rs.rows.length;
					for(var i=0;i<l;i++)res.push(new me.table(rs.rows.item(i)));
					cb(res);
				})
			},
			find: function(cond, params, restriction, cb){
				var me = this;
				return me.addCommand(function(){
					var sql = me.table._selectSql + cond + " LIMIT 1";
					me.exec(sql, params, function(tx, rs){
						me.results = rs.rows.length? new me.table(rs.rows.item(0)): null;
						if(me.toFetch)me.getAllRelations(me.results, cb);
						if(cb)cb(tx, me.results);
					});
				});
			},

			findAll: function(cond, params, restriction, cb){
				var me = this;
				return me.addCommand(function(){
					var sql = me.table._selectSql + cond;
					me.exec(sql, params, function(tx, rs){
						var l = rs.rows.length,
							res = [];
						for(var i = 0; i < l; i++)res.push(new me.table(rs.rows.item(i)));
						me.results = res;
						if(me.toFetch)res.forEach(function(ent){me.getAllRelations(ent, cb)});
						//console.log(res);
						if(cb)
						{

							cb(tx, res);
						}

					});
				});
			},

			findByPk: function(pkVal, cb){

				if(!Array.isArray(pkVal))pkVal = [pkVal];
				if(pkVal.length !== this.table.primaryKey.length)
					throw "The number of given value(s) doesn't match the number of primary key fields!:" +
					      JSON.stringify(pkVal);
				return this.find(this.table._pkClause(), pkVal, cb);
			},

			//fetch relation in a same transaction
			fetch   : function(relName){
				if(!this.toFetch)this.toFetch = {};
				var rel = this.table.relations[relName]
					, me = this
					, model;

				if(rel && (model = Models[rel.refModel]))
				{
					var txMode = this.display? "txDisplay": "tx";
					var mtd = rel.type === _relations.HAS_MANY? "directFindAll": "directFind";
					me.addCommand(function(){
						var refTx = model[txMode](me.tx);
						console.log(refTx);
						var refCommand = function(ownParams, cb){
							return refTx[mtd](rel.clause, ownParams,cb);
						};
						me.toFetch[relName] = {
							transaction: refTx,
							command    : refCommand,
							ownFields  : rel.ownFields
						};
					});

				}
				return this;

			},

			getAllRelations: function(ent, cb){
				var me = this;
				if(me.toFetch)
				{
					Object.keys(me.toFetch).forEach(function(relName){
						me.getRelation(ent, relName, cb);
					});
				}
			},

			//TODO: this is only one level, how can i go deeper and wider?
			getRelation    : function(ent, relName, cb){
				var rel = this.toFetch[relName];
				var ownParams = rel.ownFields.map(function(k){return ent[k]});
				rel.command(ownParams, function( rs){
					if(rs)
					{
						ent._rels[relName] = rs;
						if(cb)cb(tx, rs);
					}

				});
			}
		};
	}


	///*** CLASS - ArIdxTransaction ***/
	{
		ArIdxTransaction = function(tbl, tx, display){
			ArTransaction.call(this, tbl, tx, display);
		};

		ArIdxTransaction.prototype = {
			updateDictIdx: function(table){
				var dictId = table.id;
				return this
					.removeDictIdx(table)
					.addSqlCommand(
						"INSERT INTO " + this.table.tableName +
						" SELECT DISTINCT hw, " +
						dictId + " FROM " + table.tableName
					);

			},
			removeDictIdx: function(table){
				var dictId = table.id;
				return this.addSqlCommand(
					"DELETE FROM " + this.table.tableName +
				    " WHERE dict_id = ?", [dictId]
				);
			},
			findByHw:function(hw,cb){
				return this.find("hw = ?",[hw],cb);
			},
			importCsv    : null //overriding
		};

		__extends(ArIdxTransaction, ArTransaction);
	}

	///*** CLASS ArHwTransaction***/
	{
		ArHwTransation = function(tbl, tx, display){
			ArTransaction.call(this, tbl, tx, display);
		};

		ArHwTransation.prototype = {
			importCsv: function(csv, sep, cb){
				var me = this;
				ArHwTransation.__super__.importCsv.call(this, csv, sep, function(){
					Models.DictIdx.tx(me.tx).updateDictIdx(me.table).commit(cb);
				});
				return me;
			},
			drop: function(){
				var me = this;
				ArHwTransation.__super__.drop.call(this,function(){
					Models.DictIdx.tx(me.tx).removeDictIdx(me.table).commit();
				});
				return me;
			}


		};

		__extends(ArHwTransation, ArTransaction);
	}

	///*** CLASS ArTable ***/
	{
		ArTable = function(tblInfo){
			this.info = tblInfo;
			mixin(this,tblInfo);
//			this.type = tblInfo.type;
//			this.id = tblInfo.id;
//			this.label = tblInfo.label;
//			this.modelName = tblInfo.modelName;
//			this.tableName = tblInfo.tableName;
//			this.csv = tblInfo.csv;
//			this.totalRecs = tblInfo.totalRecs;
			this.primaryKey = [];
			this._selectSql = "SELECT * from " + this.tableName + " WHERE ";
			var me = this;
			//Fields
			var fields = this.fields;// = tblInfo.fields;
			var fieldKeys = Object.keys(fields);
			fieldKeys.forEach(function(fldName){

				var fld = fields[fldName];
				if(!(fld[0] in _types))throw "Invalid column type " + fld[0];
				//define clause
				fld.def = fldName + ' ' + fld[0];
				if(fld.indexOf(_constraints.UNIQUE) > 0)fld.def += ' ' + _constraints.UNIQUE;
				if(fld.indexOf(_constraints.PRIMARY_KEY) > 0)
				{
					//fld.def += ' ' + _constraints.PRIMARY_KEY;
					me.primaryKey.push(fldName);
				}
				if(fld.indexOf(_constraints.NOT_NULL) > 0)
				{
					fld.def += ' ' + _constraints.NOT_NULL;
					fld.nullable = true;
				}
				if(fld.indexOf(_constraints.AUTOINCREMENT) > 0)
				{
					fld.def += ' ' + _constraints.AUTOINCREMENT;
				}

				//css conversion function
				fld.convert = _conversions[fld[0]];
			});

			this.fieldsDef = Object.keys(fields).map(
				function(f){return fields[f].def}).join(",");

			this.foreignKeyDef = [];
			var relations = this.relations;// = tblInfo.relations;
			if(relations)
			{
				Object.keys(relations).forEach(function(relName){

					//foreign key definition
					var rel = relations[relName];
					if(!rel.refModel || !rel.type || !rel.keyMatch)
						throw 'You must provide "refMod","type" and "keyMatch" for teh relation definition';
					var ownFields = rel.ownFields = Object.keys(rel.keyMatch);
					rel.clause = ownFields
						.map(function(k){return " " + rel.keyMatch[k] + "=? "})
						.join('AND');

					if(rel.type === _relations.BELONGS_TO)
					{
						var refFields = ownFields.map(function(f){return rel.keyMatch[f]});
						me.foreignKeyDef.push(
							"FOREIGN KEY(" + ownFields.join(",") + ") REFERENCES " +
							rel.refModel + "(" + refFields.join(",") + ")"
						);
					}


				});
				this.foreignKeyDef = this.foreignKeyDef.join(",");
			}

			//create table statement
			this._createSql = "CREATE TABLE IF NOT EXISTS " + this.tableName +
			                  "(" + this.fieldsDef +
			                  (this.primaryKey.length? (", PRIMARY KEY(" + this.primaryKey.join(',') + ")"): "") +
			                  (this.foreignKeyDef.length? ("," + this.foreignKeyDef): "") +
			                  ")";
			this._insertSql = "INSERT INTO " + this.tableName + " VALUES(" +
			                  fieldKeys.map(
				                  function(){return '?'}).join(',') + ')';
			this._dropSql = "DROP TABLE IF EXISTS " + this.tableName;
			this._checkSql = "SELECT 1 FROM " + this.tableName + " LIMIT 1";
		};

		ArTable.prototype = {
			/**
			 * Start Transaction queue
			 */
			tx: function(tx, display){
				return new ArTransaction(this, tx,display);
			},

			/**
			 * show the sql statements without actually executing
			 */
			txDisplay: function(tx){
				return new ArTransaction(this, tx, true);
			},

			_pkClause: function(){
				return this._pkClauseSql || (this._pkClauseSql = this.primaryKey
					.map(function(pkName){return " " + pkName + "=? ";})
					.join("AND")
					);
			},

			_prepareTransaction:function(){
				var tx = this.tx();
				var rels = this.relations;
				if(rels)
				{
					Object.keys(rels).forEach(function(relName){
						var rel= rels[relName];
						if(rel.prefetch)tx.fetch(relName);
					});
				}
				return tx;
			},

			findByHw: function(hw,cb){
				if(!this.fields.hw)throw "no hw field!";
				return this.findAll("hw = ?",[hw],cb);
			},
			findAllByHw:function(hw,cb){
				if(!this.fields.hw)throw "no hw field!";
				return this.findAll("hw = ?",[hw],cb);
			},

			find: function(cond,params,cb){
				this._prepareTransaction().find(cond,params).commit(cb);
			},

			findAll: function(cond,params,cb){
				this._prepareTransaction().findAll(cond,params).commit(cb);
			},

			findByPk: function(pk,cb){
				this._prepareTransaction().findByPk(pk).commit(cb);
			}

		};

	}
	///*** CLASS ArIdxTable ***/
	{
		ArIdxTable = function(tblInfo){
			ArTable.call(this, tblInfo);
		};

		ArIdxTable.prototype = {
			tx : function(tx,display){
				return new ArIdxTransaction(this, tx,display);
			}

		};

		__extends(ArIdxTable, ArTable);
	}

	///*** CLASS ArHwTable ***/
	{
		ArHwTable = function(tblInfo){
			ArTable.call(this, tblInfo);
		};

		ArHwTable.prototype = {
			tx:function(tx,display){
				return new ArHwTransation(this, tx,display);
			}
		} ;

		__extends(ArHwTable, ArTable);
	}

	/**
	 *
	 * @param {String} modelName
	 * @param {Object} tblInfo
	 */
	AR.configModel = function(modelName, tblInfo){
		var tableModel
			, entityModel = function(row){AR.call(this, row)}
			;

		//--TODO: this approach doesn't seem right
		if(tblInfo.type == 'dictIdx')
			tableModel = new ArIdxTable(tblInfo);
		else if(tblInfo.type == 'dictHw')
			tableModel = new ArHwTable(tblInfo);
		else
			tableModel = new ArTable(tblInfo);
		//--

		entityModel.prototype.__proto__ = AR.prototype; //inherits AR
		entityModel.prototype._table = tableModel;       //add a table reference for ent instances
		entityModel.__proto__ = tableModel;            //the ent model per se acts as an
		//instance of corresponding table mode
		Models[modelName] = entityModel;

		///
		// use new AR.tableName(ent) to initialize an entity
		// use AR.tableName.method to call a table method, such as

		//~~~~~~~~~~~~~~~


		//Add accessors to the entityModel's prototype
		Object.keys(tableModel.fields).forEach(function(fldName){
			Object.defineProperty(entityModel.prototype, fldName, {
				get: function(){ return this.getField(fldName) },
				set: function(val){ this.setField(fldName, val) }
			});
		});
		if(tableModel.relations)
		{
			Object.keys(tableModel.relations).forEach(function(relName){
				Object.defineProperty(entityModel.prototype, relName, {
					get: function(){return this.getRelation(relName)}
				});
				entityModel.prototype['get' + relName[0].toUpperCase() + relName.slice(1)] =
				function(cb){
					this.getRelation(relName, cb);
				};
			});
		}
		//entityModel.tx().check().commit();

		return entityModel;

	};

	AR.removeModel = function(modName,cb){
		model = Models[modName];
		delete Models[modName];
		model.tx().drop().commit(cb);
		return model;
	};


	//AR instance methods
	AR.prototype = {
		getField: function(fldName){
			var fld = this._rowMem[fldName];
			return fld? fld: this._rowDB[fldName];
		},

		setField: function(fldName, val){
			this._rowMem[fldName] = val;
		},

		getRelation: function(relName, cb){
			if(!this._table.relations)return null;
			var rel = this._rels && this._rels[relName];
			if(rel)return rel;
			if(cb)
			{
				this._table.tx().getRelation(this, relName, cb);
			}
		},

		save: function(){

		}
	};

	return AR;
})();





