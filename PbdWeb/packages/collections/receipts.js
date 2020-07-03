import SimpleSchema from 'simpl-schema';

const receipts = new Mongo.Collection("receipts");

receipts.attachSchema(new SimpleSchema({
	receiptNo: {
		type: Number,
	},
	partyId: {
		type: String,
		regEx: SimpleSchema.RegEx.Id
	},
	cpName: {
		type: String,

	},
	cpNumber: {
		type: String,
		regEx: SimpleSchema.RegEx.Phone
	},
	cpEmail: {
		type: String,
		regEx: SimpleSchema.RegEx.Email,
		optional: true
	},
	amount: {
		type: Number
	},
	paidBy: {
		type: Number
	},
	chequeNo: {
		type: String,
		optional: true
	},
	ddNo: {
		type: String,
		optional: true
	},
	payment: {
		type: Number
	},
	userId: { 
		type: String, 
		regEx: SimpleSchema.RegEx.Id 
	},
	createdAt: { 
		type: Date
	}
}))

export default receipts;