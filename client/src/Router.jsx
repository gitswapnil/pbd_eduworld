import React, { useState } from 'react';
import { BrowserRouter as Router, Route } from "react-router-dom";

import Login from './Login'

const App = () => {
    return  <Router>
                <div>
                    <Route exact path="/">
                        <Login />
                    </Route>
                    <Route path="/news">
                        News
                    </Route>
                </div>
            </Router>
}

export default App;
