package com.example.pbdexecutives

import android.content.Context
import android.os.Bundle
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
import kotlinx.coroutines.CoroutineStart
import kotlinx.coroutines.GlobalScope
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

class AddNewTaskActivity : AppCompatActivity() {
    private lateinit var parties: List<PartiesListItem>
    private lateinit var selectedOrganization: String

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
        loadDoneWithTaskEvents()
        loadSetReminderEvents()
    }

    override fun onOptionsItemSelected(item: MenuItem): Boolean {
        if (item.itemId == android.R.id.home) {
            finish();
            return true;
        }

        return super.onOptionsItemSelected(item);
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

    private fun loadParties() {
        lifecycleScope.launch {
//            var partiesListLayoutView = this@AddNewTaskActivity.layoutInflater.inflate(R.layout.parties_list_layout, scrollView3, false)
            val db = Room.databaseBuilder(this@AddNewTaskActivity, AppDB::class.java, "PbdDB").build()
            parties = db.partiesDao().getAllParties().map { party ->
                return@map PartiesListItem(party.id, party.name, party.address)
            }

//            val partiesAdapter: ArrayAdapter<String> = ArrayAdapter<String>(this@AddNewTaskActivity, android.R.layout.simple_spinner_dropdown_item, parties)
            select_organization.threshold = 1
            select_organization.setAdapter(PartiesListAdapter(this@AddNewTaskActivity, parties))
            select_organization.onItemClickListener = AdapterView.OnItemClickListener { parent, view, position, id ->
//                Log.i("pbdLog", "clicked Item, ${parent.getItemAtPosition(position)}")
                val ListItem = (parent.getItemAtPosition(position) as PartiesListItem)
                select_organization.error = null
                selectedOrganization = ListItem.id
                select_organization.setText("${ListItem.name} ${ListItem.address}")
            }
        }

    }

    inner class ReasonSpinner : AdapterView.OnItemSelectedListener {
        override fun onItemSelected(parent: AdapterView<*>, view: View, pos: Int, id: Long) {
            reason_question_label.text = resources.getStringArray(R.array.task_done_questions)[pos]
            checkDoneWithTaskEvents()
        }

        override fun onNothingSelected(parent: AdapterView<*>) {
            // Another interface callback
        }
    }

    private fun loadDoneWithTaskEvents() {
        done_with_task.setOnCheckedChangeListener { group, checkedId ->
            checkDoneWithTaskEvents()
        }
    }

    private fun checkDoneWithTaskEvents() {
        val checkedId = done_with_task.checkedRadioButtonId
        val reasonForVisit = findViewById<Spinner>(R.id.reason_for_visit).selectedItemPosition
        val reminderLabels = resources.getStringArray(R.array.set_reminder_labels)

        findViewById<TextView>(R.id.reminder_label).visibility = View.VISIBLE
        findViewById<RadioGroup>(R.id.set_reminder).visibility = View.VISIBLE

        if(set_reminder.checkedRadioButtonId == R.id.reminder_no) {
            findViewById<CalendarView>(R.id.reminder_calendar).visibility = View.GONE
        } else if(set_reminder.checkedRadioButtonId == R.id.reminder_yes) {
            findViewById<CalendarView>(R.id.reminder_calendar).visibility = View.VISIBLE
        }

        if(checkedId == R.id.task_done_no) {
            when(reasonForVisit) {
                0 -> reminder_label.text = reminderLabels[0]
                1 -> reminder_label.text = reminderLabels[2]
                2 -> reminder_label.text = reminderLabels[4]
            }
        } else if(checkedId == R.id.task_done_yes) {
            when(reasonForVisit) {
                0 -> reminder_label.text = reminderLabels[1]
                1 -> reminder_label.text = reminderLabels[3]
                2 -> {
                    findViewById<CalendarView>(R.id.reminder_calendar).visibility = View.GONE
                    findViewById<TextView>(R.id.reminder_label).visibility = View.GONE
                    findViewById<RadioGroup>(R.id.set_reminder).visibility = View.GONE
                }
            }
        }
    }

    private fun loadSetReminderEvents() {
        set_reminder.setOnCheckedChangeListener { group, checkedId ->
            checkSetReminder()
        }

        val minDate = (System.currentTimeMillis() + 86399000)
        reminder_calendar.minDate = minDate
        reminder_calendar.date = minDate
    }

    private fun checkSetReminder() {
        val checkedId = set_reminder.checkedRadioButtonId
        if(checkedId == R.id.reminder_yes) {
            findViewById<CalendarView>(R.id.reminder_calendar).visibility = View.VISIBLE
        } else if(checkedId == R.id.reminder_no) {
            findViewById<CalendarView>(R.id.reminder_calendar).visibility = View.GONE
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
        findViewById<RadioGroup>(R.id.done_with_task).visibility = visibility
        findViewById<TextView>(R.id.reminder_label).visibility = visibility
        findViewById<RadioGroup>(R.id.set_reminder).visibility = visibility
        findViewById<CalendarView>(R.id.reminder_calendar).visibility = visibility

        if(visibility == View.VISIBLE) {
            checkDoneWithTaskEvents()
            checkSetReminder()
        }
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

    private fun validateFields(): Boolean {
        var retValue: Boolean = true
        if(task_type.selectedItem.toString() == "Visit") {
            if(this::selectedOrganization.isInitialized) {
                val selectedOrg = parties.find{ it.id == selectedOrganization }
                val nameAndAddress = select_organization.text.toString()
                if(selectedOrg == null || ("${selectedOrg.name} ${selectedOrg.address}") != nameAndAddress) {
                    select_organization.error = getString(R.string.select_only_from_list)
                    retValue = false
                }
            } else {
                select_organization.error = getString(R.string.this_field_is_required)
                retValue = false
            }

            if(contact_person_name.text == null || contact_person_name.text.toString() == "") {
                contact_person_name.error = getString(R.string.this_field_is_required)
                retValue = false
            }
        } else if(task_type.selectedItem.toString() == "Other") {
            if(subject.text == null || subject.text.toString() == "") {
                subject.error = getString(R.string.this_field_is_required)
                retValue = false
            }
        }

        return retValue
    }

    fun saveChanges(view: View) {
        //first validate the inputs and then save the data

        val valid:Boolean = validateFields()
        if(!valid) {
            return
        }

        val type: Int = task_type.selectedItemPosition
        val organizationId: String? = selectedOrganization
        val contactPersonName: String? = contact_person_name.text.toString()
        val contactPersonNumber: Long? = contact_person_number.text.toString().toLong()
        val reasonForVisit: Int = reason_for_visit.selectedItemPosition
        val doneWithTask: Boolean = (done_with_task.checkedRadioButtonId == R.id.task_done_yes)
        val reminder: Boolean = (set_reminder.checkedRadioButtonId == R.id.reminder_yes)
        val reminderDate: Long? = reminder_calendar.date
        val remarks: String? = remarks.text.toString()
        val subject: String? = subject.text.toString()

        lifecycleScope.launch {
            val db = Room.databaseBuilder(this@AddNewTaskActivity, AppDB::class.java, "PbdDB").build()

            val task = listOf(Tasks(
                type = type.toShort(),
                organizationId = organizationId,
                contactPersonName = contactPersonName,
                contactPersonNumber = contactPersonNumber,
                reasonForVisit = reasonForVisit.toShort(),
                doneWithTask = doneWithTask,
                reminder = reminder,
                reminderDate = reminderDate,
                remarks = remarks,
                subject = subject,
                createdAt = Date().time.toLong(),
                synced = false,
                serverId = null
            ))

            db.tasksDao().addTasks(task)
            PbdExecutivesUtils().syncData(applicationContext)

            finish()
        }
    }
}
