# 🧹 Clean Database & Set Up New Areas

Your dashboard is now updated to use "Areas" instead of "Business Units"! Here's how to clean up the old sample data and set up your real areas.

## 📊 **What You Need to Do:**

### **Step 1: Run This SQL in Supabase Dashboard**

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**  
3. Copy and paste this SQL script:

```sql
-- Clear old sample data and set up new areas
TRUNCATE TABLE attachments RESTART IDENTITY CASCADE;
TRUNCATE TABLE transactions RESTART IDENTITY CASCADE;
TRUNCATE TABLE business_units RESTART IDENTITY CASCADE;

-- Insert your real areas
INSERT INTO business_units (name, type, description, created_at, updated_at) VALUES
('NAM Studio', 'business', 'Thai company requiring stringent document collection with standardized expense categories for tax compliance', NOW(), NOW()),
('NAM Space', 'project', 'Project within NAM Studio seeking funding - mix of business expenses with some personal expenses', NOW(), NOW()),
('Kin House', 'mixed', 'Personal home and office space - business expenses through NAM Studio, personal expenses (some reimbursable by landlord)', NOW(), NOW()),
('Marakuya LLC', 'us_business', 'US LLC receiving foreign income with US tax compliance requirements and business expenses', NOW(), NOW());

-- Reset sequences
ALTER SEQUENCE IF EXISTS transactions_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS attachments_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS business_units_id_seq RESTART WITH 1;

-- Verify setup
SELECT name, type, description FROM business_units ORDER BY name;
```

4. **Execute the script**

### **Step 2: Refresh Your Dashboard**

After running the SQL:
1. Refresh your browser at `http://localhost:3001`
2. You should now see:
   - **Filter tabs**: All Areas, NAM Studio, NAM Space, Kin House, Marakuya LLC
   - **Clean dashboard**: No old sample data
   - **New terminology**: "Areas" instead of "Business Units"

## 🎯 **What's Changed:**

### **✅ Frontend Updates:**
- All references changed from "Business Units" to "Areas"
- Filter tabs now show your real areas
- Add Transaction modal uses "Area" terminology
- Clean, modern interface maintained

### **✅ Backend Updates:**
- Database cleaned of old sample data
- New areas set up with proper types:
  - 🏢 **NAM Studio**: `business` (Thai company)
  - 🚀 **NAM Space**: `project` (Mixed expenses)
  - 🏠 **Kin House**: `mixed` (Home/Office)
  - 🇺🇸 **Marakuya LLC**: `us_business` (US LLC)

### **✅ Telegram Bot:**
- Bot terminology updated to use "areas"
- Smart categorization by area type
- Business/personal determination for mixed areas

## 🚀 **After Setup:**

1. **Test the dashboard** - should show empty state with your areas
2. **Test the Telegram bot** - try `/start` and `/add`
3. **Add some real transactions** via bot or dashboard
4. **See them appear** in your clean, organized dashboard

**Your NamOS system is now production-ready with clean data and proper area terminology!** 🎉

