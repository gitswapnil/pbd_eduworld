package com.example.pbdexecutives

import android.content.Context
import android.os.Bundle
import android.text.Editable
import android.util.Log
import android.view.LayoutInflater
import android.view.MenuItem
import android.view.View
import android.view.ViewGroup
import android.widget.*
import androidx.annotation.NonNull
import androidx.appcompat.app.AppCompatActivity
import androidx.constraintlayout.widget.ConstraintSet
import androidx.lifecycle.lifecycleScope
import androidx.room.Room
import com.google.gson.annotations.SerializedName
import kotlinx.android.synthetic.main.activity_add_new_task.*
import kotlinx.coroutines.launch
import java.util.*
import kotlin.collections.ArrayList

data class PartiesListItem(
    @SerializedName("id") val id: String,
    @SerializedName("name") val name: String,
    @SerializedName("address") val address: String
)

class PartiesListAdapter(context: Context, private val parties: List<PartiesListItem>): ArrayAdapter<PartiesListItem>(context, R.layout.parties_list_layout, parties) {
    var filteredParties: MutableList<PartiesListItem> = ArrayList<PartiesListItem>()

    override fun getCount(): Int {
        return filteredParties.size
    }

    @NonNull
    override fun getFilter(): Filter {
        return PartiesFilter(this, parties)
    }

    override fun getItem(position: Int): PartiesListItem? {
        return filteredParties[position]
    }

    override fun getItemId(position: Int): Long {
        return super.getItemId(position)
    }

    override fun getView(position: Int, view: View?, parent: ViewGroup): View {
        val newView = LayoutInflater.from(context).inflate(R.layout.parties_list_layout, parent, false)
        newView.findViewById<TextView>(R.id.name).text = filteredParties[position].name
        newView.findViewById<TextView>(R.id.address).text = filteredParties[position].address
        return newView
    }


    private class PartiesFilter(var partiesListAdapter: PartiesListAdapter, val originalList: List<PartiesListItem>): Filter() {
        var filteredList: MutableList<PartiesListItem> = ArrayList()

        override fun performFiltering(constraint: CharSequence?): FilterResults {
            filteredList.clear()
            val results = FilterResults()
            if (constraint == null || constraint.isEmpty()) {
                filteredList.addAll(originalList)
            } else {
                val filterPattern = constraint.toString().toLowerCase(Locale.ROOT).trim { it <= ' ' }
                for (party in originalList) {
                    if (party.name.toLowerCase(Locale.ROOT).contains(filterPattern)) {
                        filteredList.add(party)
                    }
                }
            }

            Log.i("pbdLog", "filteredList: $filteredList")
            results.values = filteredList
            results.count = filteredList.size
            return results
        }

        override fun publishResults(constraint: CharSequence?, results: FilterResults) {
            Log.i("pbdLog", "results.values: ${results.values}")
            partiesListAdapter.filteredParties.clear()
            partiesListAdapter.filteredParties.addAll(results.values as MutableList<PartiesListItem>)
            partiesListAdapter.notifyDataSetChanged()
        }

    }
}

data class NewTaskData(
    @SerializedName("type") val type: String,
    @SerializedName("organization") val organization: String,
    @SerializedName("contactPersonName") val contactPerson: String,
    @SerializedName("contactPersonNumber") val contactPersonNumber: Long,
    @SerializedName("reasonForVisit") val reasonForVisit: String,
    @SerializedName("done") val done: String,
    @SerializedName("remarks") val remarks: String,
    @SerializedName("subject") val subject: String
)

class AddNewTaskActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_add_new_task)

        setSupportActionBar(findViewById(R.id.add_new_task_toolbar))
        supportActionBar?.setDisplayHomeAsUpEnabled(true)

        val reasonForVisit: Spinner = findViewById(R.id.reason_for_visit)
        reasonForVisit.onItemSelectedListener = ReasonSpinner()

        val taskTypes: Spinner = findViewById(R.id.task_type)
        taskTypes.onItemSelectedListener = TaskTypeSpinner()

        loadParties()
        loadDoneEvents()
    }

    private fun loadDoneEvents() {
        radioGroup.setOnCheckedChangeListener { group, checkedId ->
            val reasonForVisit = findViewById<Spinner>(R.id.reason_for_visit).selectedItemPosition
            val reminderLabels = resources.getStringArray(R.array.set_reminder_labels)

            findViewById<TextView>(R.id.reminder_label).visibility = View.VISIBLE
            findViewById<CalendarView>(R.id.reminder_calendar).visibility = View.VISIBLE

            if(checkedId == R.id.radioNo) {
                when(reasonForVisit) {
                    0 -> reminder_label.text = reminderLabels[0]
                    1 -> reminder_label.text = reminderLabels[2]
                    2 -> reminder_label.text = reminderLabels[4]
                }
            } else if(checkedId == R.id.radioYes) {
                when(reasonForVisit) {
                    0 -> reminder_label.text = reminderLabels[1]
                    1 -> reminder_label.text = reminderLabels[3]
                    2 -> {
                        findViewById<TextView>(R.id.reminder_label).visibility = View.GONE
                        findViewById<CalendarView>(R.id.reminder_calendar).visibility = View.GONE
                    }
                }
            }
        }
    }

    private fun loadParties() {
        lifecycleScope.launch {
//            var partiesListLayoutView = this@AddNewTaskActivity.layoutInflater.inflate(R.layout.parties_list_layout, scrollView3, false)
            val db = Room.databaseBuilder(this@AddNewTaskActivity, AppDB::class.java, "PbdDB").build()
            val parties: List<PartiesListItem> = db.partiesDao().getAllParties().map { party ->
                return@map PartiesListItem(party.id, party.name, party.address)
            }

//            val partiesAdapter: ArrayAdapter<String> = ArrayAdapter<String>(this@AddNewTaskActivity, android.R.layout.simple_spinner_dropdown_item, parties)
            select_organization.threshold = 1
            select_organization.setAdapter(PartiesListAdapter(this@AddNewTaskActivity, parties))
            select_organization.onItemClickListener = AdapterView.OnItemClickListener { parent, view, position, id ->
                Log.i("pbdLog", "clicked Item, ${parent.getItemAtPosition(position)}")
                val ListItem = (parent.getItemAtPosition(position) as PartiesListItem)
                select_organization.setText("${ListItem.name} ${ListItem.address}")
            }
        }

    }

    override fun onOptionsItemSelected(item: MenuItem): Boolean {
        if (item.itemId == android.R.id.home) {
            finish();
            return true;
        }

        return super.onOptionsItemSelected(item);
    }

    inner class ReasonSpinner : AdapterView.OnItemSelectedListener {
        override fun onItemSelected(parent: AdapterView<*>, view: View, pos: Int, id: Long) {
            val reminderLabels = resources.getStringArray(R.array.set_reminder_labels)

            findViewById<TextView>(R.id.reminder_label).visibility = View.VISIBLE
            findViewById<CalendarView>(R.id.reminder_calendar).visibility = View.VISIBLE

            when(pos) {
                0 -> {
                    reason_question_label.text = getString(R.string.done_with_sampling)

                    if(radioGroup.checkedRadioButtonId == R.id.radioNo) {
                        reminder_label.text = reminderLabels[0]
                    } else if(radioGroup.checkedRadioButtonId == R.id.radioYes) {
                        reminder_label.text = reminderLabels[1]
                    }
                }

                1 -> {
                    reason_question_label.text = getString(R.string.done_with_receiving_order)

                    if(radioGroup.checkedRadioButtonId == R.id.radioNo) {
                        reminder_label.text = reminderLabels[2]
                    } else if(radioGroup.checkedRadioButtonId == R.id.radioYes) {
                        reminder_label.text = reminderLabels[3]
                    }
                }

                2 -> {
                    reason_question_label.text = getString(R.string.done_with_payments)

                    if(radioGroup.checkedRadioButtonId == R.id.radioNo) {
                        reminder_label.text = reminderLabels[4]
                    } else if(radioGroup.checkedRadioButtonId == R.id.radioYes) {
                        findViewById<TextView>(R.id.reminder_label).visibility = View.GONE
                        findViewById<CalendarView>(R.id.reminder_calendar).visibility = View.GONE
                    }
                }
            }
        }

        override fun onNothingSelected(parent: AdapterView<*>) {
            // Another interface callback
        }
    }

    private fun changeVisitView(visibility: Int) {
        findViewById<TextView>(R.id.select_organization_label).visibility = visibility
        findViewById<AutoCompleteTextView>(R.id.select_organization).visibility = visibility
        findViewById<TextView>(R.id.contact_person_name_label).visibility = visibility
        findViewById<EditText>(R.id.contact_person_name).visibility = visibility
        findViewById<TextView>(R.id.contact_person_number_label).visibility = visibility
        findViewById<EditText>(R.id.contact_person_number).visibility = visibility
        findViewById<TextView>(R.id.reason_for_visit_label).visibility = visibility
        findViewById<Spinner>(R.id.reason_for_visit).visibility = visibility
        findViewById<TextView>(R.id.reason_question_label).visibility = visibility
        findViewById<RadioGroup>(R.id.radioGroup).visibility = visibility
        findViewById<TextView>(R.id.reminder_label).visibility = visibility
        findViewById<CalendarView>(R.id.reminder_calendar).visibility = visibility
    }

    private fun changeOtherView(visibility: Int) {
        findViewById<TextView>(R.id.subject_label).visibility = visibility
        findViewById<EditText>(R.id.subject).visibility = visibility

        val constraintSet: ConstraintSet = ConstraintSet()
        constraintSet.clone(add_new_task_layout)
        if(visibility == View.VISIBLE) {
            constraintSet.connect(R.id.remarks_label, ConstraintSet.TOP, R.id.subject, ConstraintSet.BOTTOM,16)
        } else {
            constraintSet.connect(R.id.remarks_label, ConstraintSet.TOP, R.id.reminder_calendar, ConstraintSet.BOTTOM,16)
        }
        constraintSet.applyTo(add_new_task_layout)


    }

    inner class TaskTypeSpinner : AdapterView.OnItemSelectedListener {
        override fun onItemSelected(parent: AdapterView<*>, view: View, pos: Int, id: Long) {
            when(parent.getItemAtPosition(pos)) {
                resources.getStringArray(R.array.task_types)[0] -> {
                    changeVisitView(View.VISIBLE)
                    changeOtherView(View.GONE)
                }

                resources.getStringArray(R.array.task_types)[1] -> {
                    changeOtherView(View.VISIBLE)
                    changeVisitView(View.GONE)
                }
            }

        }

        override fun onNothingSelected(parent: AdapterView<*>) {
            // Another interface callback
        }
    }

    fun saveChanges(view: View) {
        //first validate the inputs and then save the data
    }
}