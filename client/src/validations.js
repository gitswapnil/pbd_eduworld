const validations = {
    onlyNumber: new RegExp(/((?![0-9]).)/g),
    phoneNumber: new RegExp(/^[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]$/),
}

export default validations;