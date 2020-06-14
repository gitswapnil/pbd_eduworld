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

export const MAP_API_KEY = "2D16m-0MldWtZBO8ymMUMxz-qRlneZkQUx_s-VhRmBo";
export const DUTY_START_TIME = "10:00";    //format should always be in HH:mm
export const DUTY_END_TIME = "18:00";