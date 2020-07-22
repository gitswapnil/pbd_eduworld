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