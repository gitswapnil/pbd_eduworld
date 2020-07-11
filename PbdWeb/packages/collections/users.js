import SimpleSchema from 'simpl-schema';

Meteor.users.attachSchema(new SimpleSchema({
	"username": {
        type: String
    },

    "emails": {
        type: Array,
        optional: true
    },

    "emails.$": {
        type: Object
    },

    "emails.$.address": {
        type: String,
        regEx: SimpleSchema.RegEx.Email
    },

    "emails.$.verified": {
        type: Boolean
    },

    "createdAt": {
        type: Date,
    },

    "updatedAt": {
    	type: Date,
    },

    "profile": {
        type: new SimpleSchema({
        	"name": {
        		type: String,
        		max: 200,
        		optional: true
        	},

        	"phoneNumber": {
        		type: String,
        		regEx: SimpleSchema.RegEx.Phone,
        		optional: true
        	},

        	"address": {
        		type: String,
        		max: 1000,
        		optional: true
        	},

            "receiptSeries": {
                type: String,
                optional: true
            },

        	"img": {
        		type: String,
        		optional: true,
        	}
        }),
        optional: true
    },

    "apiKey": {
    	type: String,
    	max: 32,
    	min: 32,
    	optional: true
    },

    "active": {
    	type: Boolean,
    },

    "availableTo": {
        type: Array,
        optional: true,
    },

    "availableTo.$": {
        type: String,
        regEx: SimpleSchema.RegEx.Id
    },

    "services": {
        type: Object,
        optional: true,
        blackbox: true
    },
}, {
    clean: {
        filter: true,
        // autoConvert: true,
        removeEmptyStrings: true,
        trimStrings: true,
        // getAutoValues: true,
        removeNullsFromArrays: true,
    }
}));