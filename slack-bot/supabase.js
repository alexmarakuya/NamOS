const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Database operations for time tracking
class TimeTrackingDB {
  // Team member operations
  async createOrUpdateTeamMember(slackUserId, userData) {
    const { data, error } = await supabase
      .from('team_members')
      .upsert({
        slack_user_id: slackUserId,
        slack_username: userData.username || userData.name,
        full_name: userData.real_name || userData.profile?.real_name,
        email: userData.profile?.email,
        timezone: userData.tz || 'UTC',
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'slack_user_id',
        ignoreDuplicates: false
      });
    
    if (error) throw error;
    return data;
  }

  async getTeamMember(slackUserId) {
    const { data, error } = await supabase
      .from('team_members')
      .select('*')
      .eq('slack_user_id', slackUserId)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error; // Ignore "not found" errors
    return data;
  }

  // Project operations
  async getActiveProjects() {
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        business_units (
          name,
          type,
          color
        )
      `)
      .eq('is_active', true)
      .order('name');
    
    if (error) throw error;
    return data || [];
  }

  async getProject(projectId) {
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        business_units (
          name,
          type,
          color
        )
      `)
      .eq('id', projectId)
      .single();
    
    if (error) throw error;
    return data;
  }

  async createProject(projectData) {
    const { data, error } = await supabase
      .from('projects')
      .insert(projectData)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  // Time entry operations
  async logTime(timeEntry) {
    const { data, error } = await supabase
      .from('time_entries')
      .insert(timeEntry)
      .select(`
        *,
        projects (
          name,
          client_name,
          hourly_rate
        )
      `)
      .single();
    
    if (error) throw error;
    return data;
  }

  async getUserTimeEntries(userId, startDate = null, endDate = null) {
    let query = supabase
      .from('time_entries')
      .select(`
        *,
        projects (
          name,
          client_name,
          hourly_rate,
          business_units (
            name,
            color
          )
        )
      `)
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (startDate) {
      query = query.gte('date', startDate);
    }
    if (endDate) {
      query = query.lte('date', endDate);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  async updateTimeEntry(entryId, updates) {
    const { data, error } = await supabase
      .from('time_entries')
      .update(updates)
      .eq('id', entryId)
      .select(`
        *,
        projects (
          name,
          client_name,
          hourly_rate
        )
      `)
      .single();
    
    if (error) throw error;
    return data;
  }

  async deleteTimeEntry(entryId, userId) {
    const { data, error } = await supabase
      .from('time_entries')
      .delete()
      .eq('id', entryId)
      .eq('user_id', userId) // Ensure users can only delete their own entries
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  // Reporting operations
  async getUserDailySummary(userId, date) {
    const { data, error } = await supabase
      .rpc('get_user_daily_summary', {
        p_user_id: userId,
        p_date: date
      });
    
    if (error) throw error;
    return data?.[0] || { total_hours: 0, billable_hours: 0, project_breakdown: [] };
  }

  async getUserWeeklySummary(userId, weekStart) {
    const { data, error } = await supabase
      .from('time_tracking_summary')
      .select('*')
      .eq('user_id', userId)
      .eq('week_start', weekStart);
    
    if (error) throw error;
    return data || [];
  }

  async getTeamDailySummary(date) {
    const { data, error } = await supabase
      .from('time_entries')
      .select(`
        user_id,
        user_name,
        hours,
        is_billable,
        projects (
          name,
          client_name
        )
      `)
      .eq('date', date);
    
    if (error) throw error;
    
    // Group by user
    const summary = {};
    data?.forEach(entry => {
      if (!summary[entry.user_id]) {
        summary[entry.user_id] = {
          user_name: entry.user_name,
          total_hours: 0,
          billable_hours: 0,
          entries: []
        };
      }
      summary[entry.user_id].total_hours += parseFloat(entry.hours);
      if (entry.is_billable) {
        summary[entry.user_id].billable_hours += parseFloat(entry.hours);
      }
      summary[entry.user_id].entries.push(entry);
    });
    
    return Object.values(summary);
  }

  // Business unit operations
  async getBusinessUnits() {
    const { data, error } = await supabase
      .from('business_units')
      .select('*')
      .order('name');
    
    if (error) throw error;
    return data || [];
  }
}

module.exports = {
  supabase,
  TimeTrackingDB
};

