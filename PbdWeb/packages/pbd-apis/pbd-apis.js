import { Meteor } from 'meteor/meteor';
import React from 'react';

export const findByType = (children, component) => {
  const result = [];
  /* This is the array of result since Article can have multiple times the same sub-component */
  const type = [component.displayName] || [component.name];
  /* We can store the actual name of the component through the displayName or name property of our sub-component */
  React.Children.forEach(children, child => {
    const childType = child && child.type && (child.type.displayName || child.type.name);
    if (type.includes(childType)) {
      result.push(child);
    }
  });
  /* Then we go through each React children, if one of matches the name of the sub-component we’re looking for we put it in the result array */
  return result[0];
};

export const getReasonFromCode = (code) => {
  let retValue = "";
  switch(code) {
    case 0: retValue = "Sampling";
      break;

    case 1: retValue = "To receive an order";
      break;

    case 2: retValue = "To get payment";
      break;
  }

  return retValue;
};

export const getCodeFromReason = (reason) => {
  let retValue = -1;
  switch(reason.toLowerCase()) {
    case "sampling": retValue = 0;
      break;

    case "to receive an order": retValue = 1;
      break;

    case "to get payment": retValue = 2;
      break;
  }

  return retValue;
};

export const MAP_API_KEY = "2D16m-0MldWtZBO8ymMUMxz-qRlneZkQUx_s-VhRmBo";
export const DUTY_START_TIME = "10:00";    //format should always be in HH:mm
export const DUTY_END_TIME = "18:00";

export const PBD_NAME = "M/S. PBD Eduworld PVT. LTD.";
export const PBD_ADDRESS = "Prasad Arcade 4th floor, Mahatma Phule Road, Opp. Shree Datta Mandir, Shahapur, Belgavi - 03, KARNATAKA";
export const PBD_EMAIL = "prasadbookdist@gmail.com";
export const PBD_PHONE1 = "0831-4208621";
export const PBD_PHONE2 = "0831-4208622";
export const PBD_MOBILE1 = "9341108584";
export const PBD_MOBILE2 = "9845646605";

export const firebaseServiceAccountKey = {
  "type": "service_account",
  "project_id": "pbd-executives",
  "private_key_id": "b3ddea80182463458075fcd706b011dc6c05e4d2",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDicKix1K0OI/3j\nzRyyQfyVVdZPnBRmrdXgBYsJAQbIKcCur7tqnc+stVhcfgo6GVdHUe4R6rTOlJT0\njDKiukyq163XAFj7hPoV5VZEn7kEcMsoH44BVImEFWzVI4DoAMmuZxZkGp6qCsJ2\n+dRuC6mYY1OXuvjqNEp5K+5KzcioSAxtmc78mC9AyfaNp4aegGOX9fTUKD+XSsG7\n0rgJWoj//SZkR6TFRgwbLJDbfSFTdAZZE37bTuT9kmxT6IZvsT2g5i5V3yXFjkEe\ndCYbYiBU6sfoJreWfRSrq5Z9tzvm6cwWOo2o71K7TwV4ise9CZkkZ+drQgbwsI34\n2B+5ywIpAgMBAAECggEADWNJSghPugINQQJvw6dMmnyyeM760s5M0pupSn09zChR\nzNI1g7p0XJr1MDTAgIpeg2g36eXFTmBxBRtj5ASdQ02QqOFLoYVNbu16AgEqhHVx\nwXvKHtCDd+R3ZIuek7j2M6JDK+R6BIYx1Kx1L5NvccPPna0vidNRIuRiyJftmOtb\nE6ZnXYfrcwUi+twbAAMa2JjcvLpmnI4OSvEs4KI60+nEx/ya9yUSil8fniPv+bCw\nQ+Sq585R3Yfyy3vcEXwFsUMG/SB7VcyMXPCFCatOJcII75LXhsizsXf6+JVrjM9R\nugVqFe1WFZkWZZruxdYvDm97RuWlk+Pb+ypWt87bDQKBgQD+MYXNZVRt/plyjNUv\nBoFSdqWJKVsF/rXvTRT8xbU8SERJxx85417URts8AX+7eBGmK2Nrg/ttd/O1FMMK\nRS2owdtY/q7lIfBISyyukLRi2EgtYztj28aW89eeU2+G/UxL20yfZ0YJIlrClkyH\nARqfcuwH7gG3dZ3LvV64VCAADQKBgQDkDKRdkBxDe+2OD/qSH3ak7d2nTggveVHa\n1whmsTrudgsaxIrYvQBUGA92KnECtlvBV/4mLCbXtiB0DyddUn8C1yplzmla3cxf\n5LZqGctEvfLZC9A3OpckmLbz4gqEppBmfYzrC83KK/IhgZzBe/+Q0VfRhhORKs3K\nmts+MY0njQKBgQCZ23fVnuO/wD846q2OzS0xsMb5gqKpukZ9FfcCGNleJ4/N6Eyq\nSUl4y3qfk3ixDDgCkHiY90YUOGq2zF5RtRWx88TE1UMfRa+e0oG1F7lXqvnlHw8v\nnjNR4z47gt0ao+6ua4qxYV0u4jB1X2vqu2xV3sWm9xTq6rIcQ/81KxZDcQKBgBZ7\nfJTQyUiJ5jCUOLLBMVQvMyP0WHA9uKkne+eL33B06MFZ0QpvD6I6wQN4Sa3nxoH4\nJ9Ehly67ANYQTGQx5t2j0sU4pUBVD3oAtU8efeCoDVICjSN0vkPYXmkKxtivBxtj\nk0n03vPogzV0brzQebCQQuUgH7u3CZTI0YZ/IhhdAoGBAMR+I9SQhYkikE3gfn9p\nutD3trVZ5hOvG1gJ+Tty/ATzKIQg1Hdi8VH5C/A5zzhMxO3Yn04rem9LSqqi9a8c\nynrEX2TfxaK0DJtAHDJlk556+8/n+FSSimxtDRb/s8eDoMLKXiaUCuhZlyPb9Qgq\n5MdOKqBA65WBrEi1dVg0xGO5\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-alwdv@pbd-executives.iam.gserviceaccount.com",
  "client_id": "116649179632573156696",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-alwdv%40pbd-executives.iam.gserviceaccount.com"
};