
# Basic Types

The following are the types of objects in this language.
 * Atom - The type of symbols, or immutable strings used as identifiers.
 * Nil - A special type containing only the `()` object.
 * Cons - The type of pairs of objects, containing car and cdr cells.
 * Function - The type of functions, either built-in or using `lambda`.
 * Macro - The type of macros, either built-in or using `lambda*`.
 * String - The type of strings.
 * Number - The type of numbers.

Note that `()` is the only falsy value in this language. All other
values are truthy.

# Special Forms

## `(quote x)`

Returns the expression `x`, without evaluating it.

## `(lambda args . body)`

Constructs a function.

## `(lambda* args . body)`

Constructs a macro.

## `(def var value)`

Defines a new variable named `var` in the current scope, whose value
is `value`.

## `(set a b)`

Evaluates `a` and `b`. `a` should evaluate to a symbol. The variable
whose name is that symbol is set to the value of `b`.

## `(setq a b)`

Equivalent to `(set (quote a) b)`.

## `(if a x y)`

Evaluates `a`. If it is truthy, evaluates and returns `x`. Otherwise,
evaluates and returns `y`.

## `(prog . xs)`

Evaluates `xs` in order and returns the result of the final
expression. Equivalent to `((lambda () . xs))`.

## `(let decls . exprs)`

Opens a new lexical scope, in which the variables in `decls` exist.
`exprs` are evaluated in that scope and the result of the final
expression is returned. If there are no expressions, `()` is returned.
`decls` should be a list of elements of the form `(name value)`.

## `(let* decls . exprs)`

Like `let`, except that the later variable expressions in `decls` can
reference previous variables in the same `let*` declaration. Desugars
to a chain of nested `let` calls.

## `(letrec decls . exprs)`

Like `let`, except that functions in `decls` can reference any other
variables in `decls`, including themselves. Desugars to a `let`
binding followed by a sequence of `setq` statements.

## `(bind decls . exprs)`

Like `let`, except that the variables are bound *dynamically*. If a
dynamically bound variable exists with a given name, it will always
take precedent over a lexical variable with the same name.

## `(bind* decls . exprs)`

Like `bind` but the declarations are made in order. Desugars to a
chain of nested `bind` calls.

## `(bindrec decls . exprs)`

Like `bind` but functions declared in the `bindrec` can reference
names in the same `bindrec`, including itself. Desugars to a `bind`
followed by a sequence of `setq`.

## `(corecall name . args)`

Used internally to call system-level functions. Programmers should
never need to explicitly call this.

## `(and . args)`

Short-circuiting logical conjunction.

## `(or . args)`

Short-circuiting logical disjunction.

## `(cond . exprs)

Each expression in `exprs` should be of the form `(pred . body)`. The
first `pred` of the expressions which evaluates to truthy will have
its corresponding `body` executed. The result of that `body` will be
returned from the `cond`. If no `pred` is truthy, or if the `pred`
which is truthy has no `body`, then `()` is returned.

# Built-in Functions / Variables

## `nil`

Evaluates to `()`, the special nil object.

## `t`

Evaluates to the atom `'t`. This is actually a keyword baked into the
language, not a variable, and as such cannot be reassigned.

## `(cons x y)`

Constructs a cons cell.

## `(car x)`

Returns the car cell of a cons object.

## `(cdr x)`

Returns the cdr cell of a cons object.

## `(eq x y)`

Returns `t` if any of the conditions are satisfied.
 * The two objects are both atoms with the same name.
 * The two objects are both the special `()` object.
Otherwise, returns `()`.

## `(eql x y)`

Returns `t` if any of the conditions are satisfied.
 * `(eq x y)` is true.
 * The two objects are both numbers and they are the same number.
 * The two objects are both strings with the same text.
 * The two objects are both cons cells and the car and cdr cells of
   the objects are equal to one another.
Otherwise, returns `()`.

## `(list . xs)`

Returns all the arguments, in a list.

## `(read x)`

Parses a string into its S-expression representation.

## `(eval x)`

Evaluates an S-expression.

## `(apply f args)`

Applies the function `f` to the argument list `args`.

## `(not x)`

Returns `t` if x is `()`, or `()` otherwise.

## `(+ . xs)`

Sums up all of the arguments.

## `(* . xs)`

Returns the product of all of the arguments.

## `(- . xs)`

If given no arguments, returns `0`. If given one argument, returns the
additive inverse. If given multiple arguments, subtracts all of the
latter arguments from the first.

## `(/ . xs)`

If given no arguments, returns `1`. If given one argument, returns the
multiplicative inverse. If given multiple arguments, divides all of
the latter arguments out of the first.

## `(mod x y)`

Returns `x` modulo `y`. The returned value is always nonnegative and
will always be strictly less than the magnitude of `y`.

## `(list* x .xs)`

Like `list`, except that the final argument will be the value of the
final cdr cell in the resulting (dotted) list. `(list a b c)` is
equivalent to `(list* a b c ())`.

## `(output x)`

Outputs the value, then returns `()`.

## `(map f xs)`

Maps the function over each element of the list, returning a new list.

## `(filter p xs)`

Filters the list, removing all elements for which `p` returns falsy.
The resulting list is returned.
