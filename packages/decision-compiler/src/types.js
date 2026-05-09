/**
 * Decision Types & Operator Registry
 * 
 * تعريف الأنواع الدلالية وعقود العمليات الرياضية.
 */

export const DECISION_TYPES = {
    NUMERIC: "numeric",
    PERCENTAGE: "percentage",
    SCORE: "score",
    CURRENCY: "currency",
    BOOLEAN: "boolean",
    STRING: "string",
    VOID: "void"
};

export const OPERATOR_REGISTRY = {
    "add": {
        accepts: [DECISION_TYPES.NUMERIC, DECISION_TYPES.CURRENCY, DECISION_TYPES.PERCENTAGE],
        returns: (inputs) => inputs[0], // يعيد نفس نوع أول مدخل
        validate: (inputs) => new Set(inputs).size === 1 // يجب أن تكون جميع المدخلات من نفس النوع (Dimensional Safety)
    },
    "multiply": {
        accepts: [DECISION_TYPES.NUMERIC, DECISION_TYPES.PERCENTAGE, DECISION_TYPES.SCORE],
        returns: (inputs) => {
            if (inputs.includes(DECISION_TYPES.SCORE)) return DECISION_TYPES.SCORE;
            return DECISION_TYPES.NUMERIC;
        }
    },
    "inverse": {
        accepts: [DECISION_TYPES.NUMERIC],
        returns: () => DECISION_TYPES.NUMERIC
    },
    "gte": {
        accepts: [DECISION_TYPES.NUMERIC, DECISION_TYPES.CURRENCY],
        returns: () => DECISION_TYPES.BOOLEAN
    },
    "lte": {
        accepts: [DECISION_TYPES.NUMERIC, DECISION_TYPES.CURRENCY],
        returns: () => DECISION_TYPES.BOOLEAN
    }
};

/**
 * دالة الاستنتاج النوعي
 */
export function inferType(node, nodeMap) {
    if (node.type === "attribute") {
        return node.dataType || DECISION_TYPES.NUMERIC;
    }
    
    if (node.formula) {
        const op = OPERATOR_REGISTRY[node.formula.op];
        if (!op) return DECISION_TYPES.NUMERIC;
        
        const inputTypes = (node.dependsOn || []).map(id => nodeMap[id]?.resultType || DECISION_TYPES.NUMERIC);
        return typeof op.returns === "function" ? op.returns(inputTypes) : op.returns;
    }

    if (node.type === "gate") return DECISION_TYPES.BOOLEAN;
    if (node.type === "score") return DECISION_TYPES.SCORE;

    return DECISION_TYPES.NUMERIC;
}
