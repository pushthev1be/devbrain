'use strict';

const ajv1 = require('./ajv-1.js');

var code = {};

var hasRequiredCode;

function requireCode () {
	if (hasRequiredCode) return code;
	hasRequiredCode = 1;
	Object.defineProperty(code, "__esModule", { value: true });
	code.validateUnion = code.validateArray = code.usePattern = code.callValidateCode = code.schemaProperties = code.allSchemaProperties = code.noPropertyInData = code.propertyInData = code.isOwnProperty = code.hasPropFunc = code.reportMissingProp = code.checkMissingProp = code.checkReportMissingProp = void 0;
	const codegen_1 = /*@__PURE__*/ ajv1.requireCodegen();
	const util_1 = /*@__PURE__*/ ajv1.requireUtil();
	const names_1 = /*@__PURE__*/ ajv1.requireNames();
	const util_2 = /*@__PURE__*/ ajv1.requireUtil();
	function checkReportMissingProp(cxt, prop) {
	    const { gen, data, it } = cxt;
	    gen.if(noPropertyInData(gen, data, prop, it.opts.ownProperties), () => {
	        cxt.setParams({ missingProperty: (0, codegen_1._) `${prop}` }, true);
	        cxt.error();
	    });
	}
	code.checkReportMissingProp = checkReportMissingProp;
	function checkMissingProp({ gen, data, it: { opts } }, properties, missing) {
	    return (0, codegen_1.or)(...properties.map((prop) => (0, codegen_1.and)(noPropertyInData(gen, data, prop, opts.ownProperties), (0, codegen_1._) `${missing} = ${prop}`)));
	}
	code.checkMissingProp = checkMissingProp;
	function reportMissingProp(cxt, missing) {
	    cxt.setParams({ missingProperty: missing }, true);
	    cxt.error();
	}
	code.reportMissingProp = reportMissingProp;
	function hasPropFunc(gen) {
	    return gen.scopeValue("func", {
	        // eslint-disable-next-line @typescript-eslint/unbound-method
	        ref: Object.prototype.hasOwnProperty,
	        code: (0, codegen_1._) `Object.prototype.hasOwnProperty`,
	    });
	}
	code.hasPropFunc = hasPropFunc;
	function isOwnProperty(gen, data, property) {
	    return (0, codegen_1._) `${hasPropFunc(gen)}.call(${data}, ${property})`;
	}
	code.isOwnProperty = isOwnProperty;
	function propertyInData(gen, data, property, ownProperties) {
	    const cond = (0, codegen_1._) `${data}${(0, codegen_1.getProperty)(property)} !== undefined`;
	    return ownProperties ? (0, codegen_1._) `${cond} && ${isOwnProperty(gen, data, property)}` : cond;
	}
	code.propertyInData = propertyInData;
	function noPropertyInData(gen, data, property, ownProperties) {
	    const cond = (0, codegen_1._) `${data}${(0, codegen_1.getProperty)(property)} === undefined`;
	    return ownProperties ? (0, codegen_1.or)(cond, (0, codegen_1.not)(isOwnProperty(gen, data, property))) : cond;
	}
	code.noPropertyInData = noPropertyInData;
	function allSchemaProperties(schemaMap) {
	    return schemaMap ? Object.keys(schemaMap).filter((p) => p !== "__proto__") : [];
	}
	code.allSchemaProperties = allSchemaProperties;
	function schemaProperties(it, schemaMap) {
	    return allSchemaProperties(schemaMap).filter((p) => !(0, util_1.alwaysValidSchema)(it, schemaMap[p]));
	}
	code.schemaProperties = schemaProperties;
	function callValidateCode({ schemaCode, data, it: { gen, topSchemaRef, schemaPath, errorPath }, it }, func, context, passSchema) {
	    const dataAndSchema = passSchema ? (0, codegen_1._) `${schemaCode}, ${data}, ${topSchemaRef}${schemaPath}` : data;
	    const valCxt = [
	        [names_1.default.instancePath, (0, codegen_1.strConcat)(names_1.default.instancePath, errorPath)],
	        [names_1.default.parentData, it.parentData],
	        [names_1.default.parentDataProperty, it.parentDataProperty],
	        [names_1.default.rootData, names_1.default.rootData],
	    ];
	    if (it.opts.dynamicRef)
	        valCxt.push([names_1.default.dynamicAnchors, names_1.default.dynamicAnchors]);
	    const args = (0, codegen_1._) `${dataAndSchema}, ${gen.object(...valCxt)}`;
	    return context !== codegen_1.nil ? (0, codegen_1._) `${func}.call(${context}, ${args})` : (0, codegen_1._) `${func}(${args})`;
	}
	code.callValidateCode = callValidateCode;
	const newRegExp = (0, codegen_1._) `new RegExp`;
	function usePattern({ gen, it: { opts } }, pattern) {
	    const u = opts.unicodeRegExp ? "u" : "";
	    const { regExp } = opts.code;
	    const rx = regExp(pattern, u);
	    return gen.scopeValue("pattern", {
	        key: rx.toString(),
	        ref: rx,
	        code: (0, codegen_1._) `${regExp.code === "new RegExp" ? newRegExp : (0, util_2.useFunc)(gen, regExp)}(${pattern}, ${u})`,
	    });
	}
	code.usePattern = usePattern;
	function validateArray(cxt) {
	    const { gen, data, keyword, it } = cxt;
	    const valid = gen.name("valid");
	    if (it.allErrors) {
	        const validArr = gen.let("valid", true);
	        validateItems(() => gen.assign(validArr, false));
	        return validArr;
	    }
	    gen.var(valid, true);
	    validateItems(() => gen.break());
	    return valid;
	    function validateItems(notValid) {
	        const len = gen.const("len", (0, codegen_1._) `${data}.length`);
	        gen.forRange("i", 0, len, (i) => {
	            cxt.subschema({
	                keyword,
	                dataProp: i,
	                dataPropType: util_1.Type.Num,
	            }, valid);
	            gen.if((0, codegen_1.not)(valid), notValid);
	        });
	    }
	}
	code.validateArray = validateArray;
	function validateUnion(cxt) {
	    const { gen, schema, keyword, it } = cxt;
	    /* istanbul ignore if */
	    if (!Array.isArray(schema))
	        throw new Error("ajv implementation error");
	    const alwaysValid = schema.some((sch) => (0, util_1.alwaysValidSchema)(it, sch));
	    if (alwaysValid && !it.opts.unevaluated)
	        return;
	    const valid = gen.let("valid", false);
	    const schValid = gen.name("_valid");
	    gen.block(() => schema.forEach((_sch, i) => {
	        const schCxt = cxt.subschema({
	            keyword,
	            schemaProp: i,
	            compositeRule: true,
	        }, schValid);
	        gen.assign(valid, (0, codegen_1._) `${valid} || ${schValid}`);
	        const merged = cxt.mergeValidEvaluated(schCxt, schValid);
	        // can short-circuit if `unevaluatedProperties/Items` not supported (opts.unevaluated !== true)
	        // or if all properties and items were evaluated (it.props === true && it.items === true)
	        if (!merged)
	            gen.if((0, codegen_1.not)(valid));
	    }));
	    cxt.result(valid, () => cxt.reset(), () => cxt.error(true));
	}
	code.validateUnion = validateUnion;
	
	return code;
}

var draft7 = {};

var core = {};

var id = {};

var hasRequiredId;

function requireId () {
	if (hasRequiredId) return id;
	hasRequiredId = 1;
	Object.defineProperty(id, "__esModule", { value: true });
	const def = {
	    keyword: "id",
	    code() {
	        throw new Error('NOT SUPPORTED: keyword "id", use "$id" for schema ID');
	    },
	};
	id.default = def;
	
	return id;
}

var ref = {};

var hasRequiredRef;

function requireRef () {
	if (hasRequiredRef) return ref;
	hasRequiredRef = 1;
	Object.defineProperty(ref, "__esModule", { value: true });
	ref.callRef = ref.getValidate = void 0;
	const ref_error_1 = /*@__PURE__*/ ajv1.requireRef_error();
	const code_1 = /*@__PURE__*/ requireCode();
	const codegen_1 = /*@__PURE__*/ ajv1.requireCodegen();
	const names_1 = /*@__PURE__*/ ajv1.requireNames();
	const compile_1 = /*@__PURE__*/ ajv1.requireCompile();
	const util_1 = /*@__PURE__*/ ajv1.requireUtil();
	const def = {
	    keyword: "$ref",
	    schemaType: "string",
	    code(cxt) {
	        const { gen, schema: $ref, it } = cxt;
	        const { baseId, schemaEnv: env, validateName, opts, self } = it;
	        const { root } = env;
	        if (($ref === "#" || $ref === "#/") && baseId === root.baseId)
	            return callRootRef();
	        const schOrEnv = compile_1.resolveRef.call(self, root, baseId, $ref);
	        if (schOrEnv === undefined)
	            throw new ref_error_1.default(it.opts.uriResolver, baseId, $ref);
	        if (schOrEnv instanceof compile_1.SchemaEnv)
	            return callValidate(schOrEnv);
	        return inlineRefSchema(schOrEnv);
	        function callRootRef() {
	            if (env === root)
	                return callRef(cxt, validateName, env, env.$async);
	            const rootName = gen.scopeValue("root", { ref: root });
	            return callRef(cxt, (0, codegen_1._) `${rootName}.validate`, root, root.$async);
	        }
	        function callValidate(sch) {
	            const v = getValidate(cxt, sch);
	            callRef(cxt, v, sch, sch.$async);
	        }
	        function inlineRefSchema(sch) {
	            const schName = gen.scopeValue("schema", opts.code.source === true ? { ref: sch, code: (0, codegen_1.stringify)(sch) } : { ref: sch });
	            const valid = gen.name("valid");
	            const schCxt = cxt.subschema({
	                schema: sch,
	                dataTypes: [],
	                schemaPath: codegen_1.nil,
	                topSchemaRef: schName,
	                errSchemaPath: $ref,
	            }, valid);
	            cxt.mergeEvaluated(schCxt);
	            cxt.ok(valid);
	        }
	    },
	};
	function getValidate(cxt, sch) {
	    const { gen } = cxt;
	    return sch.validate
	        ? gen.scopeValue("validate", { ref: sch.validate })
	        : (0, codegen_1._) `${gen.scopeValue("wrapper", { ref: sch })}.validate`;
	}
	ref.getValidate = getValidate;
	function callRef(cxt, v, sch, $async) {
	    const { gen, it } = cxt;
	    const { allErrors, schemaEnv: env, opts } = it;
	    const passCxt = opts.passContext ? names_1.default.this : codegen_1.nil;
	    if ($async)
	        callAsyncRef();
	    else
	        callSyncRef();
	    function callAsyncRef() {
	        if (!env.$async)
	            throw new Error("async schema referenced by sync schema");
	        const valid = gen.let("valid");
	        gen.try(() => {
	            gen.code((0, codegen_1._) `await ${(0, code_1.callValidateCode)(cxt, v, passCxt)}`);
	            addEvaluatedFrom(v); // TODO will not work with async, it has to be returned with the result
	            if (!allErrors)
	                gen.assign(valid, true);
	        }, (e) => {
	            gen.if((0, codegen_1._) `!(${e} instanceof ${it.ValidationError})`, () => gen.throw(e));
	            addErrorsFrom(e);
	            if (!allErrors)
	                gen.assign(valid, false);
	        });
	        cxt.ok(valid);
	    }
	    function callSyncRef() {
	        cxt.result((0, code_1.callValidateCode)(cxt, v, passCxt), () => addEvaluatedFrom(v), () => addErrorsFrom(v));
	    }
	    function addErrorsFrom(source) {
	        const errs = (0, codegen_1._) `${source}.errors`;
	        gen.assign(names_1.default.vErrors, (0, codegen_1._) `${names_1.default.vErrors} === null ? ${errs} : ${names_1.default.vErrors}.concat(${errs})`); // TODO tagged
	        gen.assign(names_1.default.errors, (0, codegen_1._) `${names_1.default.vErrors}.length`);
	    }
	    function addEvaluatedFrom(source) {
	        var _a;
	        if (!it.opts.unevaluated)
	            return;
	        const schEvaluated = (_a = sch === null || sch === void 0 ? void 0 : sch.validate) === null || _a === void 0 ? void 0 : _a.evaluated;
	        // TODO refactor
	        if (it.props !== true) {
	            if (schEvaluated && !schEvaluated.dynamicProps) {
	                if (schEvaluated.props !== undefined) {
	                    it.props = util_1.mergeEvaluated.props(gen, schEvaluated.props, it.props);
	                }
	            }
	            else {
	                const props = gen.var("props", (0, codegen_1._) `${source}.evaluated.props`);
	                it.props = util_1.mergeEvaluated.props(gen, props, it.props, codegen_1.Name);
	            }
	        }
	        if (it.items !== true) {
	            if (schEvaluated && !schEvaluated.dynamicItems) {
	                if (schEvaluated.items !== undefined) {
	                    it.items = util_1.mergeEvaluated.items(gen, schEvaluated.items, it.items);
	                }
	            }
	            else {
	                const items = gen.var("items", (0, codegen_1._) `${source}.evaluated.items`);
	                it.items = util_1.mergeEvaluated.items(gen, items, it.items, codegen_1.Name);
	            }
	        }
	    }
	}
	ref.callRef = callRef;
	ref.default = def;
	
	return ref;
}

var hasRequiredCore;

function requireCore () {
	if (hasRequiredCore) return core;
	hasRequiredCore = 1;
	Object.defineProperty(core, "__esModule", { value: true });
	const id_1 = /*@__PURE__*/ requireId();
	const ref_1 = /*@__PURE__*/ requireRef();
	const core$1 = [
	    "$schema",
	    "$id",
	    "$defs",
	    "$vocabulary",
	    { keyword: "$comment" },
	    "definitions",
	    id_1.default,
	    ref_1.default,
	];
	core.default = core$1;
	
	return core;
}

var validation = {};

var limitNumber = {};

var hasRequiredLimitNumber;

function requireLimitNumber () {
	if (hasRequiredLimitNumber) return limitNumber;
	hasRequiredLimitNumber = 1;
	Object.defineProperty(limitNumber, "__esModule", { value: true });
	const codegen_1 = /*@__PURE__*/ ajv1.requireCodegen();
	const ops = codegen_1.operators;
	const KWDs = {
	    maximum: { okStr: "<=", ok: ops.LTE, fail: ops.GT },
	    minimum: { okStr: ">=", ok: ops.GTE, fail: ops.LT },
	    exclusiveMaximum: { okStr: "<", ok: ops.LT, fail: ops.GTE },
	    exclusiveMinimum: { okStr: ">", ok: ops.GT, fail: ops.LTE },
	};
	const error = {
	    message: ({ keyword, schemaCode }) => (0, codegen_1.str) `must be ${KWDs[keyword].okStr} ${schemaCode}`,
	    params: ({ keyword, schemaCode }) => (0, codegen_1._) `{comparison: ${KWDs[keyword].okStr}, limit: ${schemaCode}}`,
	};
	const def = {
	    keyword: Object.keys(KWDs),
	    type: "number",
	    schemaType: "number",
	    $data: true,
	    error,
	    code(cxt) {
	        const { keyword, data, schemaCode } = cxt;
	        cxt.fail$data((0, codegen_1._) `${data} ${KWDs[keyword].fail} ${schemaCode} || isNaN(${data})`);
	    },
	};
	limitNumber.default = def;
	
	return limitNumber;
}

var multipleOf = {};

var hasRequiredMultipleOf;

function requireMultipleOf () {
	if (hasRequiredMultipleOf) return multipleOf;
	hasRequiredMultipleOf = 1;
	Object.defineProperty(multipleOf, "__esModule", { value: true });
	const codegen_1 = /*@__PURE__*/ ajv1.requireCodegen();
	const error = {
	    message: ({ schemaCode }) => (0, codegen_1.str) `must be multiple of ${schemaCode}`,
	    params: ({ schemaCode }) => (0, codegen_1._) `{multipleOf: ${schemaCode}}`,
	};
	const def = {
	    keyword: "multipleOf",
	    type: "number",
	    schemaType: "number",
	    $data: true,
	    error,
	    code(cxt) {
	        const { gen, data, schemaCode, it } = cxt;
	        // const bdt = bad$DataType(schemaCode, <string>def.schemaType, $data)
	        const prec = it.opts.multipleOfPrecision;
	        const res = gen.let("res");
	        const invalid = prec
	            ? (0, codegen_1._) `Math.abs(Math.round(${res}) - ${res}) > 1e-${prec}`
	            : (0, codegen_1._) `${res} !== parseInt(${res})`;
	        cxt.fail$data((0, codegen_1._) `(${schemaCode} === 0 || (${res} = ${data}/${schemaCode}, ${invalid}))`);
	    },
	};
	multipleOf.default = def;
	
	return multipleOf;
}

var limitLength = {};

var hasRequiredLimitLength;

function requireLimitLength () {
	if (hasRequiredLimitLength) return limitLength;
	hasRequiredLimitLength = 1;
	Object.defineProperty(limitLength, "__esModule", { value: true });
	const codegen_1 = /*@__PURE__*/ ajv1.requireCodegen();
	const util_1 = /*@__PURE__*/ ajv1.requireUtil();
	const ucs2length_1 = /*@__PURE__*/ ajv1.requireUcs2length();
	const error = {
	    message({ keyword, schemaCode }) {
	        const comp = keyword === "maxLength" ? "more" : "fewer";
	        return (0, codegen_1.str) `must NOT have ${comp} than ${schemaCode} characters`;
	    },
	    params: ({ schemaCode }) => (0, codegen_1._) `{limit: ${schemaCode}}`,
	};
	const def = {
	    keyword: ["maxLength", "minLength"],
	    type: "string",
	    schemaType: "number",
	    $data: true,
	    error,
	    code(cxt) {
	        const { keyword, data, schemaCode, it } = cxt;
	        const op = keyword === "maxLength" ? codegen_1.operators.GT : codegen_1.operators.LT;
	        const len = it.opts.unicode === false ? (0, codegen_1._) `${data}.length` : (0, codegen_1._) `${(0, util_1.useFunc)(cxt.gen, ucs2length_1.default)}(${data})`;
	        cxt.fail$data((0, codegen_1._) `${len} ${op} ${schemaCode}`);
	    },
	};
	limitLength.default = def;
	
	return limitLength;
}

var pattern = {};

var hasRequiredPattern;

function requirePattern () {
	if (hasRequiredPattern) return pattern;
	hasRequiredPattern = 1;
	Object.defineProperty(pattern, "__esModule", { value: true });
	const code_1 = /*@__PURE__*/ requireCode();
	const util_1 = /*@__PURE__*/ ajv1.requireUtil();
	const codegen_1 = /*@__PURE__*/ ajv1.requireCodegen();
	const error = {
	    message: ({ schemaCode }) => (0, codegen_1.str) `must match pattern "${schemaCode}"`,
	    params: ({ schemaCode }) => (0, codegen_1._) `{pattern: ${schemaCode}}`,
	};
	const def = {
	    keyword: "pattern",
	    type: "string",
	    schemaType: "string",
	    $data: true,
	    error,
	    code(cxt) {
	        const { gen, data, $data, schema, schemaCode, it } = cxt;
	        const u = it.opts.unicodeRegExp ? "u" : "";
	        if ($data) {
	            const { regExp } = it.opts.code;
	            const regExpCode = regExp.code === "new RegExp" ? (0, codegen_1._) `new RegExp` : (0, util_1.useFunc)(gen, regExp);
	            const valid = gen.let("valid");
	            gen.try(() => gen.assign(valid, (0, codegen_1._) `${regExpCode}(${schemaCode}, ${u}).test(${data})`), () => gen.assign(valid, false));
	            cxt.fail$data((0, codegen_1._) `!${valid}`);
	        }
	        else {
	            const regExp = (0, code_1.usePattern)(cxt, schema);
	            cxt.fail$data((0, codegen_1._) `!${regExp}.test(${data})`);
	        }
	    },
	};
	pattern.default = def;
	
	return pattern;
}

var limitProperties = {};

var hasRequiredLimitProperties;

function requireLimitProperties () {
	if (hasRequiredLimitProperties) return limitProperties;
	hasRequiredLimitProperties = 1;
	Object.defineProperty(limitProperties, "__esModule", { value: true });
	const codegen_1 = /*@__PURE__*/ ajv1.requireCodegen();
	const error = {
	    message({ keyword, schemaCode }) {
	        const comp = keyword === "maxProperties" ? "more" : "fewer";
	        return (0, codegen_1.str) `must NOT have ${comp} than ${schemaCode} properties`;
	    },
	    params: ({ schemaCode }) => (0, codegen_1._) `{limit: ${schemaCode}}`,
	};
	const def = {
	    keyword: ["maxProperties", "minProperties"],
	    type: "object",
	    schemaType: "number",
	    $data: true,
	    error,
	    code(cxt) {
	        const { keyword, data, schemaCode } = cxt;
	        const op = keyword === "maxProperties" ? codegen_1.operators.GT : codegen_1.operators.LT;
	        cxt.fail$data((0, codegen_1._) `Object.keys(${data}).length ${op} ${schemaCode}`);
	    },
	};
	limitProperties.default = def;
	
	return limitProperties;
}

var required = {};

var hasRequiredRequired;

function requireRequired () {
	if (hasRequiredRequired) return required;
	hasRequiredRequired = 1;
	Object.defineProperty(required, "__esModule", { value: true });
	const code_1 = /*@__PURE__*/ requireCode();
	const codegen_1 = /*@__PURE__*/ ajv1.requireCodegen();
	const util_1 = /*@__PURE__*/ ajv1.requireUtil();
	const error = {
	    message: ({ params: { missingProperty } }) => (0, codegen_1.str) `must have required property '${missingProperty}'`,
	    params: ({ params: { missingProperty } }) => (0, codegen_1._) `{missingProperty: ${missingProperty}}`,
	};
	const def = {
	    keyword: "required",
	    type: "object",
	    schemaType: "array",
	    $data: true,
	    error,
	    code(cxt) {
	        const { gen, schema, schemaCode, data, $data, it } = cxt;
	        const { opts } = it;
	        if (!$data && schema.length === 0)
	            return;
	        const useLoop = schema.length >= opts.loopRequired;
	        if (it.allErrors)
	            allErrorsMode();
	        else
	            exitOnErrorMode();
	        if (opts.strictRequired) {
	            const props = cxt.parentSchema.properties;
	            const { definedProperties } = cxt.it;
	            for (const requiredKey of schema) {
	                if ((props === null || props === void 0 ? void 0 : props[requiredKey]) === undefined && !definedProperties.has(requiredKey)) {
	                    const schemaPath = it.schemaEnv.baseId + it.errSchemaPath;
	                    const msg = `required property "${requiredKey}" is not defined at "${schemaPath}" (strictRequired)`;
	                    (0, util_1.checkStrictMode)(it, msg, it.opts.strictRequired);
	                }
	            }
	        }
	        function allErrorsMode() {
	            if (useLoop || $data) {
	                cxt.block$data(codegen_1.nil, loopAllRequired);
	            }
	            else {
	                for (const prop of schema) {
	                    (0, code_1.checkReportMissingProp)(cxt, prop);
	                }
	            }
	        }
	        function exitOnErrorMode() {
	            const missing = gen.let("missing");
	            if (useLoop || $data) {
	                const valid = gen.let("valid", true);
	                cxt.block$data(valid, () => loopUntilMissing(missing, valid));
	                cxt.ok(valid);
	            }
	            else {
	                gen.if((0, code_1.checkMissingProp)(cxt, schema, missing));
	                (0, code_1.reportMissingProp)(cxt, missing);
	                gen.else();
	            }
	        }
	        function loopAllRequired() {
	            gen.forOf("prop", schemaCode, (prop) => {
	                cxt.setParams({ missingProperty: prop });
	                gen.if((0, code_1.noPropertyInData)(gen, data, prop, opts.ownProperties), () => cxt.error());
	            });
	        }
	        function loopUntilMissing(missing, valid) {
	            cxt.setParams({ missingProperty: missing });
	            gen.forOf(missing, schemaCode, () => {
	                gen.assign(valid, (0, code_1.propertyInData)(gen, data, missing, opts.ownProperties));
	                gen.if((0, codegen_1.not)(valid), () => {
	                    cxt.error();
	                    gen.break();
	                });
	            }, codegen_1.nil);
	        }
	    },
	};
	required.default = def;
	
	return required;
}

var limitItems = {};

var hasRequiredLimitItems;

function requireLimitItems () {
	if (hasRequiredLimitItems) return limitItems;
	hasRequiredLimitItems = 1;
	Object.defineProperty(limitItems, "__esModule", { value: true });
	const codegen_1 = /*@__PURE__*/ ajv1.requireCodegen();
	const error = {
	    message({ keyword, schemaCode }) {
	        const comp = keyword === "maxItems" ? "more" : "fewer";
	        return (0, codegen_1.str) `must NOT have ${comp} than ${schemaCode} items`;
	    },
	    params: ({ schemaCode }) => (0, codegen_1._) `{limit: ${schemaCode}}`,
	};
	const def = {
	    keyword: ["maxItems", "minItems"],
	    type: "array",
	    schemaType: "number",
	    $data: true,
	    error,
	    code(cxt) {
	        const { keyword, data, schemaCode } = cxt;
	        const op = keyword === "maxItems" ? codegen_1.operators.GT : codegen_1.operators.LT;
	        cxt.fail$data((0, codegen_1._) `${data}.length ${op} ${schemaCode}`);
	    },
	};
	limitItems.default = def;
	
	return limitItems;
}

var uniqueItems = {};

var hasRequiredUniqueItems;

function requireUniqueItems () {
	if (hasRequiredUniqueItems) return uniqueItems;
	hasRequiredUniqueItems = 1;
	Object.defineProperty(uniqueItems, "__esModule", { value: true });
	const dataType_1 = /*@__PURE__*/ ajv1.requireDataType();
	const codegen_1 = /*@__PURE__*/ ajv1.requireCodegen();
	const util_1 = /*@__PURE__*/ ajv1.requireUtil();
	const equal_1 = /*@__PURE__*/ ajv1.requireEqual();
	const error = {
	    message: ({ params: { i, j } }) => (0, codegen_1.str) `must NOT have duplicate items (items ## ${j} and ${i} are identical)`,
	    params: ({ params: { i, j } }) => (0, codegen_1._) `{i: ${i}, j: ${j}}`,
	};
	const def = {
	    keyword: "uniqueItems",
	    type: "array",
	    schemaType: "boolean",
	    $data: true,
	    error,
	    code(cxt) {
	        const { gen, data, $data, schema, parentSchema, schemaCode, it } = cxt;
	        if (!$data && !schema)
	            return;
	        const valid = gen.let("valid");
	        const itemTypes = parentSchema.items ? (0, dataType_1.getSchemaTypes)(parentSchema.items) : [];
	        cxt.block$data(valid, validateUniqueItems, (0, codegen_1._) `${schemaCode} === false`);
	        cxt.ok(valid);
	        function validateUniqueItems() {
	            const i = gen.let("i", (0, codegen_1._) `${data}.length`);
	            const j = gen.let("j");
	            cxt.setParams({ i, j });
	            gen.assign(valid, true);
	            gen.if((0, codegen_1._) `${i} > 1`, () => (canOptimize() ? loopN : loopN2)(i, j));
	        }
	        function canOptimize() {
	            return itemTypes.length > 0 && !itemTypes.some((t) => t === "object" || t === "array");
	        }
	        function loopN(i, j) {
	            const item = gen.name("item");
	            const wrongType = (0, dataType_1.checkDataTypes)(itemTypes, item, it.opts.strictNumbers, dataType_1.DataType.Wrong);
	            const indices = gen.const("indices", (0, codegen_1._) `{}`);
	            gen.for((0, codegen_1._) `;${i}--;`, () => {
	                gen.let(item, (0, codegen_1._) `${data}[${i}]`);
	                gen.if(wrongType, (0, codegen_1._) `continue`);
	                if (itemTypes.length > 1)
	                    gen.if((0, codegen_1._) `typeof ${item} == "string"`, (0, codegen_1._) `${item} += "_"`);
	                gen
	                    .if((0, codegen_1._) `typeof ${indices}[${item}] == "number"`, () => {
	                    gen.assign(j, (0, codegen_1._) `${indices}[${item}]`);
	                    cxt.error();
	                    gen.assign(valid, false).break();
	                })
	                    .code((0, codegen_1._) `${indices}[${item}] = ${i}`);
	            });
	        }
	        function loopN2(i, j) {
	            const eql = (0, util_1.useFunc)(gen, equal_1.default);
	            const outer = gen.name("outer");
	            gen.label(outer).for((0, codegen_1._) `;${i}--;`, () => gen.for((0, codegen_1._) `${j} = ${i}; ${j}--;`, () => gen.if((0, codegen_1._) `${eql}(${data}[${i}], ${data}[${j}])`, () => {
	                cxt.error();
	                gen.assign(valid, false).break(outer);
	            })));
	        }
	    },
	};
	uniqueItems.default = def;
	
	return uniqueItems;
}

var _const = {};

var hasRequired_const;

function require_const () {
	if (hasRequired_const) return _const;
	hasRequired_const = 1;
	Object.defineProperty(_const, "__esModule", { value: true });
	const codegen_1 = /*@__PURE__*/ ajv1.requireCodegen();
	const util_1 = /*@__PURE__*/ ajv1.requireUtil();
	const equal_1 = /*@__PURE__*/ ajv1.requireEqual();
	const error = {
	    message: "must be equal to constant",
	    params: ({ schemaCode }) => (0, codegen_1._) `{allowedValue: ${schemaCode}}`,
	};
	const def = {
	    keyword: "const",
	    $data: true,
	    error,
	    code(cxt) {
	        const { gen, data, $data, schemaCode, schema } = cxt;
	        if ($data || (schema && typeof schema == "object")) {
	            cxt.fail$data((0, codegen_1._) `!${(0, util_1.useFunc)(gen, equal_1.default)}(${data}, ${schemaCode})`);
	        }
	        else {
	            cxt.fail((0, codegen_1._) `${schema} !== ${data}`);
	        }
	    },
	};
	_const.default = def;
	
	return _const;
}

var _enum = {};

var hasRequired_enum;

function require_enum () {
	if (hasRequired_enum) return _enum;
	hasRequired_enum = 1;
	Object.defineProperty(_enum, "__esModule", { value: true });
	const codegen_1 = /*@__PURE__*/ ajv1.requireCodegen();
	const util_1 = /*@__PURE__*/ ajv1.requireUtil();
	const equal_1 = /*@__PURE__*/ ajv1.requireEqual();
	const error = {
	    message: "must be equal to one of the allowed values",
	    params: ({ schemaCode }) => (0, codegen_1._) `{allowedValues: ${schemaCode}}`,
	};
	const def = {
	    keyword: "enum",
	    schemaType: "array",
	    $data: true,
	    error,
	    code(cxt) {
	        const { gen, data, $data, schema, schemaCode, it } = cxt;
	        if (!$data && schema.length === 0)
	            throw new Error("enum must have non-empty array");
	        const useLoop = schema.length >= it.opts.loopEnum;
	        let eql;
	        const getEql = () => (eql !== null && eql !== void 0 ? eql : (eql = (0, util_1.useFunc)(gen, equal_1.default)));
	        let valid;
	        if (useLoop || $data) {
	            valid = gen.let("valid");
	            cxt.block$data(valid, loopEnum);
	        }
	        else {
	            /* istanbul ignore if */
	            if (!Array.isArray(schema))
	                throw new Error("ajv implementation error");
	            const vSchema = gen.const("vSchema", schemaCode);
	            valid = (0, codegen_1.or)(...schema.map((_x, i) => equalCode(vSchema, i)));
	        }
	        cxt.pass(valid);
	        function loopEnum() {
	            gen.assign(valid, false);
	            gen.forOf("v", schemaCode, (v) => gen.if((0, codegen_1._) `${getEql()}(${data}, ${v})`, () => gen.assign(valid, true).break()));
	        }
	        function equalCode(vSchema, i) {
	            const sch = schema[i];
	            return typeof sch === "object" && sch !== null
	                ? (0, codegen_1._) `${getEql()}(${data}, ${vSchema}[${i}])`
	                : (0, codegen_1._) `${data} === ${sch}`;
	        }
	    },
	};
	_enum.default = def;
	
	return _enum;
}

var hasRequiredValidation;

function requireValidation () {
	if (hasRequiredValidation) return validation;
	hasRequiredValidation = 1;
	Object.defineProperty(validation, "__esModule", { value: true });
	const limitNumber_1 = /*@__PURE__*/ requireLimitNumber();
	const multipleOf_1 = /*@__PURE__*/ requireMultipleOf();
	const limitLength_1 = /*@__PURE__*/ requireLimitLength();
	const pattern_1 = /*@__PURE__*/ requirePattern();
	const limitProperties_1 = /*@__PURE__*/ requireLimitProperties();
	const required_1 = /*@__PURE__*/ requireRequired();
	const limitItems_1 = /*@__PURE__*/ requireLimitItems();
	const uniqueItems_1 = /*@__PURE__*/ requireUniqueItems();
	const const_1 = /*@__PURE__*/ require_const();
	const enum_1 = /*@__PURE__*/ require_enum();
	const validation$1 = [
	    // number
	    limitNumber_1.default,
	    multipleOf_1.default,
	    // string
	    limitLength_1.default,
	    pattern_1.default,
	    // object
	    limitProperties_1.default,
	    required_1.default,
	    // array
	    limitItems_1.default,
	    uniqueItems_1.default,
	    // any
	    { keyword: "type", schemaType: ["string", "array"] },
	    { keyword: "nullable", schemaType: "boolean" },
	    const_1.default,
	    enum_1.default,
	];
	validation.default = validation$1;
	
	return validation;
}

var format$1 = {};

var format = {};

var hasRequiredFormat$1;

function requireFormat$1 () {
	if (hasRequiredFormat$1) return format;
	hasRequiredFormat$1 = 1;
	Object.defineProperty(format, "__esModule", { value: true });
	const codegen_1 = /*@__PURE__*/ ajv1.requireCodegen();
	const error = {
	    message: ({ schemaCode }) => (0, codegen_1.str) `must match format "${schemaCode}"`,
	    params: ({ schemaCode }) => (0, codegen_1._) `{format: ${schemaCode}}`,
	};
	const def = {
	    keyword: "format",
	    type: ["number", "string"],
	    schemaType: "string",
	    $data: true,
	    error,
	    code(cxt, ruleType) {
	        const { gen, data, $data, schema, schemaCode, it } = cxt;
	        const { opts, errSchemaPath, schemaEnv, self } = it;
	        if (!opts.validateFormats)
	            return;
	        if ($data)
	            validate$DataFormat();
	        else
	            validateFormat();
	        function validate$DataFormat() {
	            const fmts = gen.scopeValue("formats", {
	                ref: self.formats,
	                code: opts.code.formats,
	            });
	            const fDef = gen.const("fDef", (0, codegen_1._) `${fmts}[${schemaCode}]`);
	            const fType = gen.let("fType");
	            const format = gen.let("format");
	            // TODO simplify
	            gen.if((0, codegen_1._) `typeof ${fDef} == "object" && !(${fDef} instanceof RegExp)`, () => gen.assign(fType, (0, codegen_1._) `${fDef}.type || "string"`).assign(format, (0, codegen_1._) `${fDef}.validate`), () => gen.assign(fType, (0, codegen_1._) `"string"`).assign(format, fDef));
	            cxt.fail$data((0, codegen_1.or)(unknownFmt(), invalidFmt()));
	            function unknownFmt() {
	                if (opts.strictSchema === false)
	                    return codegen_1.nil;
	                return (0, codegen_1._) `${schemaCode} && !${format}`;
	            }
	            function invalidFmt() {
	                const callFormat = schemaEnv.$async
	                    ? (0, codegen_1._) `(${fDef}.async ? await ${format}(${data}) : ${format}(${data}))`
	                    : (0, codegen_1._) `${format}(${data})`;
	                const validData = (0, codegen_1._) `(typeof ${format} == "function" ? ${callFormat} : ${format}.test(${data}))`;
	                return (0, codegen_1._) `${format} && ${format} !== true && ${fType} === ${ruleType} && !${validData}`;
	            }
	        }
	        function validateFormat() {
	            const formatDef = self.formats[schema];
	            if (!formatDef) {
	                unknownFormat();
	                return;
	            }
	            if (formatDef === true)
	                return;
	            const [fmtType, format, fmtRef] = getFormat(formatDef);
	            if (fmtType === ruleType)
	                cxt.pass(validCondition());
	            function unknownFormat() {
	                if (opts.strictSchema === false) {
	                    self.logger.warn(unknownMsg());
	                    return;
	                }
	                throw new Error(unknownMsg());
	                function unknownMsg() {
	                    return `unknown format "${schema}" ignored in schema at path "${errSchemaPath}"`;
	                }
	            }
	            function getFormat(fmtDef) {
	                const code = fmtDef instanceof RegExp
	                    ? (0, codegen_1.regexpCode)(fmtDef)
	                    : opts.code.formats
	                        ? (0, codegen_1._) `${opts.code.formats}${(0, codegen_1.getProperty)(schema)}`
	                        : undefined;
	                const fmt = gen.scopeValue("formats", { key: schema, ref: fmtDef, code });
	                if (typeof fmtDef == "object" && !(fmtDef instanceof RegExp)) {
	                    return [fmtDef.type || "string", fmtDef.validate, (0, codegen_1._) `${fmt}.validate`];
	                }
	                return ["string", fmtDef, fmt];
	            }
	            function validCondition() {
	                if (typeof formatDef == "object" && !(formatDef instanceof RegExp) && formatDef.async) {
	                    if (!schemaEnv.$async)
	                        throw new Error("async format in sync schema");
	                    return (0, codegen_1._) `await ${fmtRef}(${data})`;
	                }
	                return typeof format == "function" ? (0, codegen_1._) `${fmtRef}(${data})` : (0, codegen_1._) `${fmtRef}.test(${data})`;
	            }
	        }
	    },
	};
	format.default = def;
	
	return format;
}

var hasRequiredFormat;

function requireFormat () {
	if (hasRequiredFormat) return format$1;
	hasRequiredFormat = 1;
	Object.defineProperty(format$1, "__esModule", { value: true });
	const format_1 = /*@__PURE__*/ requireFormat$1();
	const format = [format_1.default];
	format$1.default = format;
	
	return format$1;
}

var metadata = {};

var hasRequiredMetadata;

function requireMetadata () {
	if (hasRequiredMetadata) return metadata;
	hasRequiredMetadata = 1;
	Object.defineProperty(metadata, "__esModule", { value: true });
	metadata.contentVocabulary = metadata.metadataVocabulary = void 0;
	metadata.metadataVocabulary = [
	    "title",
	    "description",
	    "default",
	    "deprecated",
	    "readOnly",
	    "writeOnly",
	    "examples",
	];
	metadata.contentVocabulary = [
	    "contentMediaType",
	    "contentEncoding",
	    "contentSchema",
	];
	
	return metadata;
}

var hasRequiredDraft7;

function requireDraft7 () {
	if (hasRequiredDraft7) return draft7;
	hasRequiredDraft7 = 1;
	Object.defineProperty(draft7, "__esModule", { value: true });
	const core_1 = /*@__PURE__*/ requireCore();
	const validation_1 = /*@__PURE__*/ requireValidation();
	const applicator_1 = /*@__PURE__*/ ajv1.requireApplicator();
	const format_1 = /*@__PURE__*/ requireFormat();
	const metadata_1 = /*@__PURE__*/ requireMetadata();
	const draft7Vocabularies = [
	    core_1.default,
	    validation_1.default,
	    (0, applicator_1.default)(),
	    format_1.default,
	    metadata_1.metadataVocabulary,
	    metadata_1.contentVocabulary,
	];
	draft7.default = draft7Vocabularies;
	
	return draft7;
}

var discriminator = {};

var types = {};

var hasRequiredTypes;

function requireTypes () {
	if (hasRequiredTypes) return types;
	hasRequiredTypes = 1;
	Object.defineProperty(types, "__esModule", { value: true });
	types.DiscrError = void 0;
	var DiscrError;
	(function (DiscrError) {
	    DiscrError["Tag"] = "tag";
	    DiscrError["Mapping"] = "mapping";
	})(DiscrError || (types.DiscrError = DiscrError = {}));
	
	return types;
}

var hasRequiredDiscriminator;

function requireDiscriminator () {
	if (hasRequiredDiscriminator) return discriminator;
	hasRequiredDiscriminator = 1;
	Object.defineProperty(discriminator, "__esModule", { value: true });
	const codegen_1 = /*@__PURE__*/ ajv1.requireCodegen();
	const types_1 = /*@__PURE__*/ requireTypes();
	const compile_1 = /*@__PURE__*/ ajv1.requireCompile();
	const ref_error_1 = /*@__PURE__*/ ajv1.requireRef_error();
	const util_1 = /*@__PURE__*/ ajv1.requireUtil();
	const error = {
	    message: ({ params: { discrError, tagName } }) => discrError === types_1.DiscrError.Tag
	        ? `tag "${tagName}" must be string`
	        : `value of tag "${tagName}" must be in oneOf`,
	    params: ({ params: { discrError, tag, tagName } }) => (0, codegen_1._) `{error: ${discrError}, tag: ${tagName}, tagValue: ${tag}}`,
	};
	const def = {
	    keyword: "discriminator",
	    type: "object",
	    schemaType: "object",
	    error,
	    code(cxt) {
	        const { gen, data, schema, parentSchema, it } = cxt;
	        const { oneOf } = parentSchema;
	        if (!it.opts.discriminator) {
	            throw new Error("discriminator: requires discriminator option");
	        }
	        const tagName = schema.propertyName;
	        if (typeof tagName != "string")
	            throw new Error("discriminator: requires propertyName");
	        if (schema.mapping)
	            throw new Error("discriminator: mapping is not supported");
	        if (!oneOf)
	            throw new Error("discriminator: requires oneOf keyword");
	        const valid = gen.let("valid", false);
	        const tag = gen.const("tag", (0, codegen_1._) `${data}${(0, codegen_1.getProperty)(tagName)}`);
	        gen.if((0, codegen_1._) `typeof ${tag} == "string"`, () => validateMapping(), () => cxt.error(false, { discrError: types_1.DiscrError.Tag, tag, tagName }));
	        cxt.ok(valid);
	        function validateMapping() {
	            const mapping = getMapping();
	            gen.if(false);
	            for (const tagValue in mapping) {
	                gen.elseIf((0, codegen_1._) `${tag} === ${tagValue}`);
	                gen.assign(valid, applyTagSchema(mapping[tagValue]));
	            }
	            gen.else();
	            cxt.error(false, { discrError: types_1.DiscrError.Mapping, tag, tagName });
	            gen.endIf();
	        }
	        function applyTagSchema(schemaProp) {
	            const _valid = gen.name("valid");
	            const schCxt = cxt.subschema({ keyword: "oneOf", schemaProp }, _valid);
	            cxt.mergeEvaluated(schCxt, codegen_1.Name);
	            return _valid;
	        }
	        function getMapping() {
	            var _a;
	            const oneOfMapping = {};
	            const topRequired = hasRequired(parentSchema);
	            let tagRequired = true;
	            for (let i = 0; i < oneOf.length; i++) {
	                let sch = oneOf[i];
	                if ((sch === null || sch === void 0 ? void 0 : sch.$ref) && !(0, util_1.schemaHasRulesButRef)(sch, it.self.RULES)) {
	                    const ref = sch.$ref;
	                    sch = compile_1.resolveRef.call(it.self, it.schemaEnv.root, it.baseId, ref);
	                    if (sch instanceof compile_1.SchemaEnv)
	                        sch = sch.schema;
	                    if (sch === undefined)
	                        throw new ref_error_1.default(it.opts.uriResolver, it.baseId, ref);
	                }
	                const propSch = (_a = sch === null || sch === void 0 ? void 0 : sch.properties) === null || _a === void 0 ? void 0 : _a[tagName];
	                if (typeof propSch != "object") {
	                    throw new Error(`discriminator: oneOf subschemas (or referenced schemas) must have "properties/${tagName}"`);
	                }
	                tagRequired = tagRequired && (topRequired || hasRequired(sch));
	                addMappings(propSch, i);
	            }
	            if (!tagRequired)
	                throw new Error(`discriminator: "${tagName}" must be required`);
	            return oneOfMapping;
	            function hasRequired({ required }) {
	                return Array.isArray(required) && required.includes(tagName);
	            }
	            function addMappings(sch, i) {
	                if (sch.const) {
	                    addMapping(sch.const, i);
	                }
	                else if (sch.enum) {
	                    for (const tagValue of sch.enum) {
	                        addMapping(tagValue, i);
	                    }
	                }
	                else {
	                    throw new Error(`discriminator: "properties/${tagName}" must have "const" or "enum"`);
	                }
	            }
	            function addMapping(tagValue, i) {
	                if (typeof tagValue != "string" || tagValue in oneOfMapping) {
	                    throw new Error(`discriminator: "${tagName}" values must be unique strings`);
	                }
	                oneOfMapping[tagValue] = i;
	            }
	        }
	    },
	};
	discriminator.default = def;
	
	return discriminator;
}

exports.requireCode = requireCode;
exports.requireDiscriminator = requireDiscriminator;
exports.requireDraft7 = requireDraft7;
