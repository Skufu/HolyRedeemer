import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings as SettingsIcon, BookOpen, DollarSign, GraduationCap, Save, RotateCcw, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useSettings, useUpdateSettings } from '@/hooks/useSettings';

interface SettingsState {
  library_name: string;
  school_year: string;
  max_books_per_student: string;
  loan_duration_days: string;
  max_renewals: string;
  fine_per_day: string;
  fine_grace_period_days: string;
  max_fine_cap: string;
  fine_block_threshold: string;
  reading_quota_per_year: string;
}

const defaultSettings: SettingsState = {
  library_name: 'Holy Redeemer School Library',
  school_year: '2024-2025',
  max_books_per_student: '3',
  loan_duration_days: '7',
  max_renewals: '2',
  fine_per_day: '5.00',
  fine_grace_period_days: '1',
  max_fine_cap: '200.00',
  fine_block_threshold: '100.00',
  reading_quota_per_year: '12',
};

const Settings: React.FC = () => {
  const [settings, setSettings] = useState<SettingsState>(defaultSettings);
  const [originalSettings, setOriginalSettings] = useState<SettingsState>(defaultSettings);
  const [hasChanges, setHasChanges] = useState(false);
  const { toast } = useToast();
  
  const { data: settingsData, isLoading } = useSettings();
  const updateMutation = useUpdateSettings();

  useEffect(() => {
    if (settingsData?.data) {
      const newSettings: SettingsState = { ...defaultSettings };
      settingsData.data.forEach((s) => {
        const key = s.key as keyof SettingsState;
        if (key in newSettings) {
          newSettings[key] = s.value;
        }
      });
      setSettings(newSettings);
      setOriginalSettings(newSettings);
    }
  }, [settingsData]);

  const handleChange = (field: keyof SettingsState, value: string) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    const changedSettings: Record<string, string> = {};
    Object.keys(settings).forEach((key) => {
      const k = key as keyof SettingsState;
      if (settings[k] !== originalSettings[k]) {
        changedSettings[key] = settings[k];
      }
    });

    if (Object.keys(changedSettings).length === 0) {
      toast({ title: 'No Changes', description: 'No settings were modified.' });
      return;
    }

    updateMutation.mutate({ settings: changedSettings }, {
      onSuccess: () => {
        setOriginalSettings(settings);
        setHasChanges(false);
      },
    });
  };

  const handleReset = () => {
    setSettings(originalSettings);
    setHasChanges(false);
    toast({
      title: 'Settings Reset',
      description: 'Settings have been reset to saved values.',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-primary">Library Settings</h1>
          <p className="text-muted-foreground">Configure library policies and rules</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleReset} disabled={!hasChanges} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges || updateMutation.isPending} className="gap-2">
            {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Changes
          </Button>
        </div>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <SettingsIcon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="font-display">General Settings</CardTitle>
                <CardDescription>Basic library information</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="libraryName">Library Name</Label>
                <Input
                  id="libraryName"
                  value={settings.library_name}
                  onChange={(e) => handleChange('library_name', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="schoolYear">School Year</Label>
                <Input
                  id="schoolYear"
                  value={settings.school_year}
                  onChange={(e) => handleChange('school_year', e.target.value)}
                  placeholder="2024-2025"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-info/10">
                <BookOpen className="h-5 w-5 text-info" />
              </div>
              <div>
                <CardTitle className="font-display">Borrowing Rules</CardTitle>
                <CardDescription>Configure book borrowing policies</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="maxBooks">Max Books Per Student</Label>
                <Input
                  id="maxBooks"
                  type="number"
                  min={1}
                  max={10}
                  value={settings.max_books_per_student}
                  onChange={(e) => handleChange('max_books_per_student', e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Maximum books a student can borrow at once</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="loanDuration">Loan Duration (Days)</Label>
                <Input
                  id="loanDuration"
                  type="number"
                  min={1}
                  max={60}
                  value={settings.loan_duration_days}
                  onChange={(e) => handleChange('loan_duration_days', e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Default borrowing period</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxRenewals">Maximum Renewals</Label>
                <Input
                  id="maxRenewals"
                  type="number"
                  min={0}
                  max={5}
                  value={settings.max_renewals}
                  onChange={(e) => handleChange('max_renewals', e.target.value)}
                />
                <p className="text-xs text-muted-foreground">How many times a book can be renewed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <DollarSign className="h-5 w-5 text-warning-foreground" />
              </div>
              <div>
                <CardTitle className="font-display">Fine Settings</CardTitle>
                <CardDescription>Configure overdue fine policies</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="finePerDay">Fine Per Day (₱)</Label>
                <Input
                  id="finePerDay"
                  type="number"
                  min={0}
                  step={0.5}
                  value={settings.fine_per_day}
                  onChange={(e) => handleChange('fine_per_day', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gracePeriod">Grace Period (Days)</Label>
                <Input
                  id="gracePeriod"
                  type="number"
                  min={0}
                  max={7}
                  value={settings.fine_grace_period_days}
                  onChange={(e) => handleChange('fine_grace_period_days', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxFine">Maximum Fine Cap (₱)</Label>
                <Input
                  id="maxFine"
                  type="number"
                  min={0}
                  value={settings.max_fine_cap}
                  onChange={(e) => handleChange('max_fine_cap', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="blockThreshold">Block Threshold (₱)</Label>
                <Input
                  id="blockThreshold"
                  type="number"
                  min={0}
                  value={settings.fine_block_threshold}
                  onChange={(e) => handleChange('fine_block_threshold', e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Block borrowing above this fine amount</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <GraduationCap className="h-5 w-5 text-success" />
              </div>
              <div>
                <CardTitle className="font-display">Reading Quota</CardTitle>
                <CardDescription>Annual reading requirements for students</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="max-w-xs space-y-2">
              <Label htmlFor="quota">Required Books Per Year</Label>
              <Input
                id="quota"
                type="number"
                min={0}
                max={100}
                value={settings.reading_quota_per_year}
                onChange={(e) => handleChange('reading_quota_per_year', e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Minimum books students must read per school year
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
