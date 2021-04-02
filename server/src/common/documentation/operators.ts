export interface fthtmlop {
    documentation: string
}

const operators: { [key: string]: fthtmlop } = {

    'eq': {
        documentation: 'Validate equality'
    },
    'ne': {
        documentation: 'Validate not equal'
    },
    'ie': {
        documentation: 'Validate case-insensitive equality'
    },
    'gt': {
        documentation: 'Validate if the left hand side is greater than right hand side'
    },
    'lt': {
        documentation: 'Validate if the left hand side is less than right hand side'
    },
    'ge' : {
        documentation: 'Validate if the left hand side is greater than or equal to right hand side'
    },
    'le' : {
        documentation: 'Validate if the left hand side is less than or equal to right hand side'
    },
    'contains' : {
        documentation: 'Validate if the left hand side contains right hand side. If the right hand side is a variable that contains an array, data types will be maintained. If the right hand side contains an object, keys will queried'
    },
    'icontains' : {
        documentation: 'Validate if the left hand side contains right hand side, case-insensitive. If the right hand side is a variable that contains an array, data types will be maintained. If the right hand side contains an object, keys will queried'
    },
    'starts' : {
        documentation: 'Validate if the left hand side starts with right hand side value'
    },
    'ends' : {
        documentation: 'Validate if the left hand side ends with right hand side value'
    },
    'istarts' : {
        documentation: 'Validate if the left hand side starts with right hand side value case-insensitive'
    },
    'iends' : {
        documentation: 'Validate if the left hand side ends with right hand side value case-insensitive'
    },
    'match' : {
        documentation: 'Validate if the left hand side matches the right hand side value'
    },
    'imatch': {
        documentation: 'Validate if the left hand side matches the right hand side value, case-insensitive'
    }

}

export default operators;