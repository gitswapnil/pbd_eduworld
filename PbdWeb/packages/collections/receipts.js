import SimpleSchema from 'simpl-schema';

const receipts = new Mongo.Collection("receipts");

receipts.attachSchema(new SimpleSchema({
	"receiptNo": {
		type: Number,
	},
	"partyId": {
		type: String,
		regEx: SimpleSchema.RegEx.Id
	},
	"cpList": {
		type: Array
	},
	"cpList.$": {
		type: Object
	},
	"cpList.$.cpName": {
		type: String
	},
	"cpList.$.cpNumber": {
		type: String,
		regEx: SimpleSchema.RegEx.Phone
	},
	"cpList.$.cpEmail": {
		type: String,
		regEx: SimpleSchema.RegEx.Email,
		optional: true
	},
	"cpList.$.createdAt": {
		type: Date,
	},
	"amount": {
		type: Number
	},
	"paidBy": {
		type: Number
	},
	"chequeNo": {
		type: String,
		optional: true
	},
	"ddNo": {
		type: String,
		optional: true
	},
	"payment": {
		type: Number
	},
	"userId": { 
		type: String, 
		regEx: SimpleSchema.RegEx.Id 
	},
	"createdAt": { 
		type: Date
	}
}))

export default receipts;