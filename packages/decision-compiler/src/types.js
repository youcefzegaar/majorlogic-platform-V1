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
        name: "Addition",
        accepts: [DECISION_TYPES.NUMERIC, DECISION_TYPES.CURRENCY, DECISION_TYPES.PERCENTAGE],
        returns: (inputs) => inputs[0], 
        validate: (inputs) => {
            if (inputs.length < 2) return { valid: false, error: "Addition requires at least 2 arguments." };
            const uniqueTypes = new Set(inputs);
            if (uniqueTypes.size > 1) return { valid: false, error: `Dimensional Inconsistency: Cannot add ${Array.from(uniqueTypes).join(" and ")}` };
            return { valid: true };
        }
    },
    "multiply": {
        name: "Multiplication",
        accepts: [DECISION_TYPES.NUMERIC, DECISION_TYPES.PERCENTAGE, DECISION_TYPES.SCORE],
        returns: (inputs) => {
            if (inputs.includes(DECISION_TYPES.SCORE)) return DECISION_TYPES.SCORE;
            if (inputs.includes(DECISION_TYPES.PERCENTAGE)) return DECISION_TYPES.NUMERIC;
            return DECISION_TYPES.NUMERIC;
        },
        validate: (inputs) => {
            if (inputs.length < 2) return { valid: false, error: "Multiplication requires at least 2 arguments." };
            return { valid: true };
        }
    },
    "inverse": {
        name: "Inversion",
        accepts: [DECISION_TYPES.NUMERIC],
        returns: () => DECISION_TYPES.NUMERIC,
        validate: (inputs) => inputs.length === 1 ? { valid: true } : { valid: false, error: "Inversion requires exactly 1 argument." }
    },
    "gte": {
        name: "Greater Than or Equal",
        accepts: [DECISION_TYPES.NUMERIC, DECISION_TYPES.CURRENCY],
        returns: () => DECISION_TYPES.BOOLEAN,
        validate: (inputs) => {
            if (inputs.length !== 2) return { valid: false, error: "Comparison requires 2 arguments." };
            if (inputs[0] !== inputs[1]) return { valid: false, error: `Incompatible comparison: ${inputs[0]} vs ${inputs[1]}` };
            return { valid: true };
        }
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
