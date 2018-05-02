
function html(str) {
	return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function bless(obj, refname) {
	obj.blessing = refname;
	return obj;
}

function ref(obj) {
	if (obj == null || typeof obj.blessing == "undefined")
		return null;
	else
		return obj.blessing;
}

function Reader(str) {
	var reader = {
		str: str,
		n: 0
	};
	reader.clone = function () {
		var rdr = Reader(this.str);
		rdr.n = this.n;
		return rdr;
	};
	reader.assign = function (other) {
		this.str = other.str;
		this.n = other.n;
		return this;
	};
	reader.eof = function () {
		return this.n >= this.str.length;
	};
	reader.peek = function (n) {
		if (n == null)
			n = 1;
		return this.str.slice(this.n, this.n + n);
	};
	reader.pop = function (n) {
		if (n == null)
			n = 1;
		var temp = this.peek(n);
		this.n += n;
		return temp;
	};
	bless(reader, 'Reader');
	return reader;
}

function Frame(parent) {
	if (typeof parent == "undefined")
		parent = null;
	var frame = {
		_vars: {},
		_parent: parent
	};
	frame.has = function (str) {
		if (typeof this._vars[str] != "undefined")
			return true;
		else if (this._parent != null)
			return this._parent.has(str);
		else
			return false;
	};
	frame.get = function (str) {
		if (typeof this._vars[str] != "undefined")
			return this._vars[str];
		else if (this._parent != null)
			return this._parent.get(str);
		else
			return Nil();
	};
	frame.set = function (str, val) {
		if (typeof this._vars[str] != "undefined")
			return (this._vars[str] = val);
		else if (this._parent != null)
			return this._parent.set(str, val);
		else
			return Nil();
	};
	frame.declare = function (str, val) {
		if (val == null)
			val = Nil();
		this._vars[str] = val;
		return val;
	}
	frame.parent = function () {
		return this._parent;
	}
	bless(frame, 'Frame');
	return frame;
}

function Scope(lex, dyn) {
	var scope = {
		_lex: lex,
		_dyn: dyn
	};
	scope.hasLex = function (str) {
		return this._lex.has(str);
	};
	scope.getLex = function (str) {
		return this._lex.get(str);
	};
	scope.setLex = function (str, val) {
		return this._lex.set(str, val);
	};
	scope.declareLex = function (str, val) {
		return this._lex.declare(str, val);
	};
	scope.hasDyn = function (str) {
		return this._dyn.has(str);
	};
	scope.getDyn = function (str) {
		return this._dyn.get(str);
	};
	scope.setDyn = function (str, val) {
		return this._dyn.set(str, val);
	};
	scope.declareDyn = function (str, val) {
		return this._dyn.declare(str, val);
	};
	scope.hasEither = function (str) {
		return this.hasLex(str) || this.hasDyn(str);
	}
	scope.getEither = function (str) {
		if (this.hasDyn(str))
			return this.getDyn(str);
		else
			return this.getLex(str);
	}
	scope.setEither = function (str, val) {
		if (this.hasDyn(str))
			return this.setDyn(str, val);
		else
			return this.setLex(str, val);
	}
	scope.lex = function () {
		return this._lex;
	}
	scope.dyn = function () {
		return this._dyn;
	}
	bless(scope, 'Scope');
	return scope;
}

function Atom(str) {
	var atom = {
		_str: str
	};
	atom.str = function () {
		return this._str;
	};
	bless(atom, 'Atom');
	return atom;
}

function Cons(car, cdr) {
	var list = {
		_car: car,
		_cdr: cdr
	};
	list.car = function(x) {
		if (x != null)
			this._car = x;
		return this._car;
	};
	list.cdr = function(x) {
		if (x != null)
			this._cdr = x;
		return this._cdr;
	};
	bless(list, 'Cons');
	return list;
}

function Nil() {
	var nil = {};
	bless(nil, 'Nil');
	return nil;
}

function List() {
	if (arguments.length == 0) {
		return Nil();
	} else {
		var toplevel = Cons(Nil(), Nil());
		var cell = toplevel;
		for (var i = 0; i < arguments.length; i++) {
			cell.cdr( Cons(arguments[i], Nil()) );
			cell = cell.cdr();
		}
		return toplevel.cdr();
	}
}

function Function(parms, lex, body) {
	var func = {
		parms: parms,
		lex: lex,
		body: body
	};
	func.call = function (dyn, args) {
		function _bind_args(lex0, parm0, arg0) {
			switch (ref(parm0)) {
			case 'Nil':
				switch (ref(arg0)) {
				case 'Nil':
					break;
				case 'Cons':
					throw "Wrong number of arguments";
				default:
					throw "Invalid arglist";
				}
				break;
			case 'Cons':
				switch (ref(arg0)) {
				case 'Nil':
					throw "Wrong number of arguments";
				case 'Cons':
					lex0.declare(parm0.car().str(), arg0.car());
					_bind_args(lex0, parm0.cdr(), arg0.cdr());
					break;
				default:
					throw "Invalid arglist";
				}
				break;
			case 'Atom':
				lex0.declare(parm0.str(), arg0); // TODO Copy the arglist so it doesn't get altered by the function
				break;
			default:
				throw "Invalid parameter list";
			}
		}
		var lex1 = Frame(this.lex);
		var dyn1 = Frame(dyn);
		_bind_args(lex1, this.parms, args);
		var scope = Scope(lex1, dyn1);
		var result = Nil();
		var body0 = this.body;
		while (ref(body0) != "Nil") {
			result = evaluate(scope, body0.car());
			body0 = body0.cdr();
		}
		return result;
	};
	bless(func, 'Function');
	return func;
}

function Macro(parms, lex, body) {
	var mac = {
		parms: parms,
		lex: lex,
		body: body
	};
	mac.__proto__ = Function();
	bless(mac, 'Macro');
	return mac;
}

function String(str) {
	var strng = {
		_str: str
	};
	strng.str = function () {
		return this._str;
	};
	bless(strng, 'String');
	return strng;
}

function Number(num) {
	var numb = {
		_num: num
	};
	numb.num = function () {
		return this._num;
	}
	bless(numb, 'Number');
	return numb;
}

function splice(scope0, scope1) {
	return Scope(scope0.lex(), scope1.dyn());
}

function skip_whitespace(reader) {
	while (/[ \t\n]/.test(reader.peek()))
		reader.pop();
	return reader;
}

function parse_atom(reader) {
	var reader0 = reader.clone();
	var str = "";
	var curr = reader.peek();
	while (/[^ \t\n()']/.test(curr)) {
		str += curr;
		reader.pop();
		curr = reader.peek();
	}
	if (str) {
		return Atom(str.toUpperCase());
	} else {
		reader.assign(reader0);
		return null;
	}
}

function parse_list(reader) {
	function _parse_list(reader1) {
		if (reader.peek() == ".") { // Dotted list
			reader.pop();
			skip_whitespace(reader);
			var expr = parse_expr(reader);
			if ((expr) && (reader.peek() == ")")) {
				return expr;
			}
			return null;
		} else {
			var expr = parse_expr(reader);
			if (expr) {
				var list = _parse_list(reader);
				if (list)
					return Cons(expr, list);
				else
					return null;
			} else if (reader.peek() == ")") {
				return Nil();
			} else {
				return null;
			}
		}
	}
	var reader0 = reader.clone();
	if (reader.peek() == "(") {
		reader.pop();
		skip_whitespace(reader);
		var list = _parse_list(reader);
		if ((list) && (reader.peek() == ")")) {
			reader.pop();
			return list;
		}
	}
	reader.assign(reader0);
	return null;
}

function parse_quote(reader) {
	var reader0 = reader.clone();
	if (reader.peek() == "'") {
		reader.pop();
		skip_whitespace(reader);
		var expr = parse_expr(reader);
		if (expr)
			return List(Atom("QUOTE"), expr);
	}
	reader.assign(reader0);
	return null;
}

function parse_string(reader) {
	var reader0 = reader.clone();
	if (reader.peek() == '"') {
		reader.pop();
		var str = "";
		while ((reader.peek() != '"') && (!reader.eof())) {
			var ch = reader.pop();
			if (ch == '\\') {
				ch = reader.pop();
				if (ch == '')
					throw "Unterminated string";
				else if (ch == 'n')
					str += '\n';
				else if (ch == 'r')
					str += '\r';
				else
					str += ch;
			} else {
				str += ch;
			}
		}
		if (reader.pop() == '"')
			return String(str);
	}
	reader.assign(reader0);
	return null;
}

function parse_number(reader) {
	var reader0 = reader.clone();
	var sign = 1;
	var digits = 0;
	var has_digits = false;
	if (reader.peek() == '+') {
		reader.pop();
	} else if (reader.peek() == '-') {
		reader.pop();
		sign = -1;
	}
	while (/[0-9]/.test(reader.peek())) {
		digits = digits * 10 + parseInt(reader.pop());
		has_digits = true;
	}
	if (reader.peek() == '.') {
		reader.pop();
		var pow = -1;
		while (/[0-9]/.test(reader.peek())) {
			digits += Math.pow(10, pow) * parseInt(reader.pop());
			has_digits = true;
			pow--;
		}
	}
	// TODO Scientific notation
	if (has_digits) {
		return Number(digits);
	}
	reader.assign(reader0);
	return null;
}

function parse_expr(reader) {
	var thing = parse_string(reader) || parse_quote(reader) || parse_list(reader) || parse_number(reader) || parse_atom(reader) || null;
	if (thing)
		skip_whitespace(reader);
	return thing;
}

function core_call(scope, form, args) { // Unlike with special_form(), the args are evaluated by the time they get here
	if (ref(form) != "Atom")
		throw "No such core call";
	switch (form.str()) {
	case "CONS":
		return Cons(args.car(), args.cdr().car());
	case "CAR":
		return args.car().car();
	case "CDR":
		return args.car().cdr();
	case "EQ":
		var one = args.car();
		var two = args.cdr().car();
		if (ref(one) == 'Atom' && ref(two) == 'Atom')
			return (one.str() == two.str()) ? Atom('T') : Nil();
		else if (ref(one) == 'Nil' && ref(two) == 'Nil')
			return Atom('T');
		else
			return Nil();
	case "EQL":
		var one = args.car();
		var two = args.cdr().car();
		function _cmp(one, two) {
			if (ref(one) == 'Atom' && ref(two) == 'Atom')
				return (one.str() == two.str()) ? Atom('T') : Nil();
			else if (ref(one) == 'Number' && ref(two) == 'Number')
				return (one.num() == two.num()) ? Atom('T') : Nil();
			else if (ref(one) == 'String' && ref(two) == 'String')
				return (one.str() == two.str()) ? Atom('T') : Nil();
			else if (ref(one) == 'Nil' && ref(two) == 'Nil')
				return Atom('T');
			else if (ref(one) == 'Cons' && ref(two) == 'Cons')
				return _cmp(one.car(), two.car()) && _cmp(one.cdr(), two.cdr());
			else
				return Nil();
		}
		return _cmp(one, two);
	case "READ":
		return read(args.car().str());
	case "EVAL":
		return evaluate(Scope(scope.lex().parent(), scope.dyn()), args.car());
	case "APPLY":
		var func = args.car();
		var args0 = args.cdr().car();
		var ee = args0;
		var base = Cons(Nil(), Nil());
		var args1 = base;
		while (ref(ee) == "Cons") {
			args1.cdr(Cons(ee.car(), Nil()));
			args1 = args1.cdr();
			ee = ee.cdr();
		}
		return func.call(scope.dyn(), base.cdr());
	case "ADD":
		return Number(args.car().num() + args.cdr().car().num());
	case "SUB":
		return Number(args.car().num() - args.cdr().car().num());
	case "MUL":
		return Number(args.car().num() * args.cdr().car().num());
	case "DIV":
		return Number(args.car().num() / args.cdr().car().num());
	case "MOD":
		return Number(args.car().num() % args.cdr().car().num());
	case "OUTPUT":
		output(html(to_string(args.car())));
		return Nil();
	}
	throw "No such core call";
}

function special_form(scope, form, args) {
	if (ref(form) != "Atom")
		return null;
	switch (form.str()) {
	case "QUOTE":
		return args.car();
	case "LAMBDA":
		return Function(args.car(), scope.lex(), args.cdr());
	case "LAMBDA*":
		return Macro(args.car(), scope.lex(), args.cdr());
	case "DEF":
		return scope.declareLex(args.car().str(), evaluate(scope, args.cdr().car()));
	case "SET":
		return scope.setEither(evaluate(scope, args.car()).str(), evaluate(scope, args.cdr().car()));
	case "SETQ":
		return scope.setEither(args.car().str(), evaluate(scope, args.cdr().car()));
	case "IF":
		var result = evaluate(scope, args.car());
		var tt = args.cdr().car();
		var ff = args.cdr().cdr().car();
		if (ref(result) == 'Nil')
			return evaluate(scope, ff);
		else
			return evaluate(scope, tt);
	case "PROG":
		return evaluate(scope, List(Cons(Atom("LAMBDA"), Cons(Nil(), args))));
	case "LET":
		var vars = args.car();
		var stmts = args.cdr();
		var varnames = Cons(Nil(), Nil());
		var varvals = Cons(Nil(), Nil());
		var vnames = varnames, vvals = varvals;
		while (ref(vars) != 'Nil') {
			vnames.cdr(Cons(vars.car().car(), Nil()));
			vvals.cdr(Cons(vars.car().cdr().car(), Nil()));
			vnames = vnames.cdr();
			vvals = vvals.cdr();
			vars = vars.cdr();
		}
		var lambda = Cons(Atom("LAMBDA"), Cons(varnames.cdr(), stmts));
		var stmt = Cons(lambda, varvals.cdr());
		return evaluate(scope, stmt);
	case "LET*":
		var vars = args.car();
		var stmts = args.cdr();
		if (ref(vars) == 'Nil') {
			return evaluate(scope, Cons(Atom("PROG"), stmts));
		} else {
			var inner = Cons(Atom("LET*"), Cons(vars.cdr(), stmts));
			var outer = Cons(Atom("LET"), Cons(List(vars.car()), List(inner)));
			return evaluate(scope, outer);
		}
	case "LETREC":
		var vars = args.car();
		var stmts = args.cdr();
		var varnames = Cons(Nil(), Nil());
		var varvals = Cons(Nil(), Nil());
		var vnames = varnames, vvals = varvals;
		while (ref(vars) != 'Nil') {
			vnames.cdr(Cons(List(vars.car().car(), Nil()), Nil()));
			vvals.cdr(Cons(List(Atom("SETQ"), vars.car().car(), vars.car().cdr().car()), Nil()));
			vnames = vnames.cdr();
			vvals = vvals.cdr();
			vars = vars.cdr();
		}
		vvals.cdr(stmts);
		return evaluate(scope, Cons(Atom("LET"), Cons(varnames.cdr(), varvals.cdr())));
	case "BIND":
		var vars = args.car();
		var stmts = args.cdr();
		var stmt = Cons(Atom("PROG"), stmts);
		var scope1 = Scope(scope.lex(), Frame(scope.dyn()));
		var curr1 = vars;
		while (ref(curr1) != 'Nil') {
			var curr = curr1.car();
			scope1.declareDyn(curr.car().str(), evaluate(scope, curr.cdr().car()));
			curr1 = curr1.cdr();
		}
		return evaluate(scope1, stmt);
	case "BIND*":
		var vars = args.car();
		var stmts = args.cdr();
		if (ref(vars) == 'Nil') {
			return evaluate(scope, Cons(Atom("PROG"), stmts));
		} else {
			var inner = Cons(Atom("BIND*"), Cons(vars.cdr(), stmts));
			var outer = Cons(Atom("BIND"), Cons(List(vars.car()), List(inner)));
			return evaluate(scope, outer);
		}
	case "BINDREC":
		var vars = args.car();
		var stmts = args.cdr();
		var varnames = Cons(Nil(), Nil());
		var varvals = Cons(Nil(), Nil());
		var vnames = varnames, vvals = varvals;
		while (ref(vars) != 'Nil') {
			vnames.cdr(Cons(List(vars.car().car(), Nil()), Nil()));
			vvals.cdr(Cons(List(Atom("SETQ"), vars.car().car(), vars.car().cdr().car()), Nil()));
			vnames = vnames.cdr();
			vvals = vvals.cdr();
			vars = vars.cdr();
		}
		vvals.cdr(stmts);
		return evaluate(scope, Cons(Atom("LET"), Cons(varnames.cdr(), varvals.cdr())));
	case "CORECALL":
		var form0 = args.car();
		var args0 = args.cdr();
		var args1 = Cons(Nil(), Nil());
		var args2 = args1;
		while (ref(args0) != 'Nil') {
			args2.cdr(Cons(evaluate(scope, args0.car()), Nil()));
			args2 = args2.cdr();
			args0 = args0.cdr();
		}
		return core_call(scope, form0, args1.cdr());
	case "AND":
		if (ref(args) == 'Nil')
			return Atom('T');
		if (ref(args.cdr()) == 'Nil')
			return evaluate(scope, args.car());
		if (ref(evaluate(scope, args.car())) == 'Nil')
			return Nil();
		else
			return evaluate(scope, Cons(Atom("AND"), args.cdr()));
	case "OR":
		if (ref(args) == 'Nil')
			return Nil();
		var self = evaluate(scope, args.car());
		if (ref(self) == 'Nil')
			return evaluate(scope, Cons(Atom("OR"), args.cdr()));
		else
			return self;
	case "COND":
		if (ref(args) == 'Nil')
			return Nil();
		var cell = args.car();
		var pred = cell.car();
		var stmts = Cons(Atom("PROG"), cell.cdr());
		var rest = args.cdr();
		if (ref(evaluate(scope, pred)) != 'Nil')
			return evaluate(scope, stmts);
		else
			return evaluate(scope, Cons(Atom("COND"), rest));
	}
	return null;
}

function read(str) {
	var rdr = Reader(str);
	skip_whitespace(rdr);
	return parse_expr(rdr);
}

function evaluate(scope, expr) {
	//console.log(to_string(expr));
	switch (ref(expr)) {
	case "Atom":
		if (expr.str() == 'T') // "True" evaluates to itself
			return expr;
		if (!scope.hasEither(expr.str()))
			throw "No such variable";
		return scope.getEither(expr.str());
	case "Nil":
		return Nil();
	case "Cons":
		var spc = special_form(scope, expr.car(), expr.cdr());
		if (spc) {
			return spc;
		} else {
			var func = evaluate(scope, expr.car());
			if (ref(func) == "Function") {
				var ee = expr.cdr();
				var base = Cons(Nil(), Nil());
				var args = base;
				while (ref(ee) == "Cons") {
					args.cdr(Cons(evaluate(scope, ee.car()), Nil()));
					args = args.cdr();
					ee = ee.cdr();
				}
				return func.call(scope.dyn(), base.cdr());
			} else if (ref(func) == "Macro") {
				var ee = expr.cdr();
				var base = Cons(Nil(), Nil());
				var args = base;
				while (ref(ee) == "Cons") {
					args.cdr(Cons(ee.car(), Nil()));
					args = args.cdr();
					ee = ee.cdr();
				}
				var newcode = func.call(scope.dyn(), base.cdr());
				return evaluate(scope, newcode);
			} else {
				throw "Not a function";
			}
		}
	case "Function":
	case "String":
	case "Macro":
	case "Number":
	default:
		return expr;
	}
}

function to_string(expr) {
	function _list_to_str(expr1) {
		var str0 = to_string(expr1.car());
		switch (ref(expr1.cdr())) {
		case "Nil":
			return str0;
		case "Cons":
			return str0 + " " + _list_to_str(expr1.cdr());
		default:
			return str0 + " . " + to_string(expr1.cdr());
		}
	}
	switch (ref(expr)) {
	case "Atom":
		return expr.str();
	case "Nil":
		return "()";
	case "Cons":
		return "(" + _list_to_str(expr) + ")";
	case "Function":
		return "<Function>";
	case "Macro":
		return "<Macro>";
	case "String":
		var str = '"';
		for (var i = 0; i < expr.str().length; i++) {
			var ch = expr.str()[i];
			if (ch == '"')
				str += '\\"';
			else if (ch == '\n')
				str += '\\n';
			else if (ch == '\r')
				str += '\\r';
			else if (ch == '\\')
				str += '\\\\';
			else
				str += ch;
		}
		str += '"';
		return str;
	case "Number":
		return expr.num()+'';
	default:
		return "<???>";
	}
}

function initialize(global) {
	evaluate(global, read("(def nil ())"));
	evaluate(global, read("(def cons (lambda (x y) (corecall cons x y)))"));
	evaluate(global, read("(def car (lambda (x) (corecall car x)))"));
	evaluate(global, read("(def cdr (lambda (x) (corecall cdr x)))"));
	evaluate(global, read("(def eq (lambda (x y) (corecall eq x y)))"));
	evaluate(global, read("(def eql (lambda (x y) (corecall eql x y)))"));
	evaluate(global, read("(def list (lambda xs xs))"));
	evaluate(global, read("(def read (lambda (x) (corecall read x)))"));
	evaluate(global, read("(def eval (lambda (x) (corecall eval x)))"));
	evaluate(global, read("(def apply (lambda (x y) (corecall apply x y)))"));
	evaluate(global, read("(def not (lambda (x) (if x () t)))"));
	evaluate(global, read("(def + (lambda xs (if xs (corecall add (car xs) (apply + (cdr xs))) 0)))"));
	evaluate(global, read("(def * (lambda xs (if xs (corecall mul (car xs) (apply * (cdr xs))) 1)))"));
	evaluate(global, read("(def - (lambda xs (if xs \
	                                             (if (cdr xs) \
													 (letrec ((subn (lambda (ys) (if ys (if (cdr ys) (subn (cons (corecall sub (car ys) (car (cdr ys))) (cdr (cdr ys)))) (car ys)) 0)))) \
														(subn xs)) \
													 (- 0 (car xs))) \
												 0)))"));
	evaluate(global, read("(def / (lambda xs (if xs \
	                                             (if (cdr xs) \
													 (letrec ((divn (lambda (ys) (if ys (if (cdr ys) (divn (cons (corecall div (car ys) (car (cdr ys))) (cdr (cdr ys)))) (car ys)) 1)))) \
														(divn xs)) \
													 (/ 1 (car xs))) \
												 1)))"));
	evaluate(global, read("(def mod (lambda (x y) (corecall mod x y)))"));
	evaluate(global, read("(def list* (lambda (x . xs) (if xs (cons x (apply list* xs)) x)))"));
	evaluate(global, read("(def output (lambda (x) (corecall output x)))"));
	evaluate(global, read("(def map (lambda (f x) (if x (cons (f (car x)) (map f (cdr x))) x)))"));
	evaluate(global, read("(def filter (lambda (p x) (if x (let ((rest (filter p (cdr x))) (pred (p x))) (if pred (cons x rest) rest)) x)))"));
}
