export function buildMongoQuery(node) {
    if (!node || !Array.isArray(node.rules) || node.rules.length === 0) {
      return {}; // No rules: match all documents
    }
  
    const opsMap = {
      '>': '$gt',
      '<': '$lt',
      '=': '$eq',
      '>=': '$gte',
      '<=': '$lte',
      '!=': '$ne',
      'contains': { $regex: value => new RegExp(escapeRegExp(value), 'i') }
    };
  
    // Escape regex special characters for safe queries
    function escapeRegExp(string) {
      return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
  
    // Convert string values to appropriate types for MongoDB
    function convertValue(field, value) {
      if (value === null || value === undefined) return null;
      switch (field) {
        case 'spend':
        case 'visits':
        case 'inactiveDays':
          return Number(value);
        default:
          return value;
      }
    }
  
    function parseNode(n) {
      // Handle group nodes (AND/OR)
      if (n.combinator && Array.isArray(n.rules)) {
        const clauses = n.rules
          .map(parseNode)
          .filter(Boolean);
        if (clauses.length === 0) return null;
        return {
          [n.combinator === 'or' ? '$or' : '$and']: clauses
        };
      }
  
      // Handle rule nodes
      const { field, operator, value } = n;
      if (!field || !operator || value === undefined || value === '') {
        return null;
      }
      const convertedValue = convertValue(field, value);
      if (convertedValue === null) return null;
  
      // Special handling: inactiveDays is mapped to lastOrderDate
      if (field === 'inactiveDays') {
        const now = new Date();
        const cutoffDate = new Date(now.getTime() - (convertedValue * 24 * 60 * 60 * 1000));
        // Reverse operator for date comparison
        const reversedOps = {
          '>': '$lt',
          '<': '$gt',
          '>=': '$lte',
          '<=': '$gte',
          '=': '$eq',
          '!=': '$ne'
        };
        return { lastOrderDate: { [reversedOps[operator] || opsMap[operator]]: cutoffDate } };
      }
  
      if (operator === 'contains') {
        return { [field]: opsMap.contains(convertedValue) };
      }
      // Standard comparison
      return { [field]: { [opsMap[operator]]: convertedValue } };
    }
  
    const filter = parseNode(node);
    return filter || {};
  }
  
  // Validate query structure and types for supported fields/operators
  export function validateQuery(query) {
    const errors = [];
    function validateNode(node) {
      if (!node || typeof node !== 'object') {
        errors.push('Invalid rule node: not an object');
        return;
      }
      if (node.combinator !== undefined || node.rules !== undefined) {
        // Group node
        if (typeof node.combinator !== 'string' || !Array.isArray(node.rules)) {
          errors.push('Invalid group node: missing combinator or rules array');
          return;
        }
        if (!['and', 'or'].includes(node.combinator)) {
          errors.push(`Invalid combinator: ${node.combinator}`);
        }
        node.rules.forEach(validateNode);
        return;
      }
      // Rule node
      const { field, operator, value } = node;
      if (!field) errors.push('Missing field in rule');
      if (!operator) errors.push(`Missing operator for field: ${field}`);
      const validFields = ['spend', 'visits', 'inactiveDays'];
      if (!validFields.includes(field)) {
        errors.push(`Unknown field: ${field}`);
      }
      const validOps = ['>', '<', '=', '>=', '<=', '!='];
      if (!validOps.includes(operator)) {
        errors.push(`Invalid operator ${operator} for field ${field}`);
      }
      if (value === undefined || value === '') {
        errors.push(`Missing value for field: ${field}`);
      } else {
        if (['spend', 'visits', 'inactiveDays'].includes(field)) {
          const num = Number(value);
          if (isNaN(num)) {
            errors.push(`Invalid numeric value for ${field}: ${value}`);
          }
        }
      }
    }
    if (!query || typeof query !== 'object') {
      errors.push('Invalid query: not an object');
    } else {
      validateNode(query);
    }
    return errors;
  }
  
  // Create a MongoDB aggregation pipeline from the query
  export function createAggregationPipeline(query) {
    const filter = buildMongoQuery(query);
    return [
      { $match: filter },
      // Additional pipeline stages (e.g., analytics) can be added here
    ];
  }