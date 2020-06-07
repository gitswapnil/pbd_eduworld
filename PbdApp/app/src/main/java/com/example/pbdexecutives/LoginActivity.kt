package com.example.pbdexecutives

import android.content.Intent
import androidx.appcompat.app.AppCompatActivity
import android.os.Bundle
import android.view.View
import android.widget.EditText
import android.widget.Toast
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.lifecycleScope
import androidx.room.Room
import com.android.volley.DefaultRetryPolicy
import com.android.volley.Request
import com.android.volley.Response
import com.android.volley.toolbox.JsonObjectRequest
import com.android.volley.toolbox.Volley
import kotlinx.coroutines.GlobalScope
import kotlinx.coroutines.launch
import org.json.JSONObject


class LoginActivity : AppCompatActivity(), LifecycleOwner {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_login)
    }

    fun login(view: View) {
        val phNo = findViewById<EditText>(R.id.editText).text.toString();
        val pwd = findViewById<EditText>(R.id.editText2).text.toString();

        val queue = Volley.newRequestQueue(this);       //create a request
        val url = "${PbdExecutivesUtils().serverAddress}/executivelogin";             //url for the request
        val jsonString:JSONObject = JSONObject("{\"phNo\": \"${phNo}\", \"pwd\": \"${pwd}\"}");     //convert the string to JSON object

        val request = JsonObjectRequest(
            Request.Method.POST, url, jsonString,
            Response.Listener { response ->
                val responseJSON:JSONObject = JSONObject(response.toString());      //convert the response back into JSON Object from the response string
                if(responseJSON.get("error") == false) {            //If it has no errors, then store the apiKey and go to HomeActivity
                    val self = this;
                    this.lifecycleScope.launch {
                        val db = Room.databaseBuilder(self, AppDB::class.java, "PbdDB").build();
                        db.userDetailsDao().clearUserDetails();     //clear the user details before inserting a new value
                        val userDetail = UserDetails(id = 1, apiKey = responseJSON.get("message").toString());
                        db.userDetailsDao().saveUserDetails(userDetail);        //store the apiKey in local database.

                        val intent = Intent(self, HomeActivity::class.java);        //go to home activity after save
                        startActivity(intent);
                        finishAffinity();
                    }
                } else {            //otherwise keep showing the error
                    Toast.makeText(this, responseJSON.get("message").toString(), Toast.LENGTH_LONG).show();
                }
            },
            Response.ErrorListener {
                val res:String = "Unable to connect to server...";
                Toast.makeText(this, res, Toast.LENGTH_LONG).show();
            })

        // Volley request policy, only one time request to avoid duplicate transaction
        request.retryPolicy = DefaultRetryPolicy(
            DefaultRetryPolicy.DEFAULT_TIMEOUT_MS,
            // 0 means no retry
            0, // DefaultRetryPolicy.DEFAULT_MAX_RETRIES = 2
            1f // DefaultRetryPolicy.DEFAULT_BACKOFF_MULT
        )

        // Add the volley post request to the request queue
        VolleySingleton.getInstance(this).addToRequestQueue(request);
    }
}
