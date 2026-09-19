import React, { useState, useEffect } from 'react';
import {
  PRHCustomer,
  PRHEquipment,
  PRHFinanceTransaction,
  PRHMaintenance,
  PRHNotificationLog,
  PRHPayment,
  PRHRental,
  PRHReservation,
  PRHReturnRecord,
  PRHSettings,
  PRHTabType,
} from '../../types/prhTypes';
import {
  getPRHCustomers,
  savePRHCustomers,
  getPRHEquipment,
  savePRHEquipment,
  getPRHRentals,
  savePRHRentals,
  getPRHReturns,
  savePRHReturns,
  getPRHPayments,
  savePRHPayments,
  getPRHFinanceTransactions,
  savePRHFinanceTransactions,
  getPRHReservations,
  savePRHReservations,
  getPRHMaintenance,
  savePRHMaintenance,
  getPRHReminderTemplates,
  savePRHReminderTemplates,
  getPRHNotificationLogs,
  savePRHNotificationLogs,
  getPRHSettings,
  savePRHSettings,
} from '../../utils/prhStorage';

import { PRHDashboardView } from './PRHDashboardView';
import { PRHNewRentalView } from './PRHNewRentalView';
import { PRHActiveRentalsView } from './PRHActiveRentalsView';
import { PRHReturnsView } from './PRHReturnsView';
import { PRHCustomersView } from './PRHCustomersView';
import { PRHEquipmentView } from './PRHEquipmentView';
import { PRHInventoryView } from './PRHInventoryView';
import { PRHFinanceView } from './PRHFinanceView';
import { PRHPaymentsView } from './PRHPaymentsView';
import { PRHRemindersView } from './PRHRemindersView';
import { PRHMaintenanceView } from './PRHMaintenanceView';
import { PRHReservationsView } from './PRHReservationsView';
import { PRHReportsView } from './PRHReportsView';
import { PRHSettingsView } from './PRHSettingsView';

interface PRHHubProps {
  activeTab: PRHTabType;
  setActiveTab: (tab: PRHTabType) => void;
  currentUserEmail?: string;
  themeMode?: 'dark' | 'light';
}

export const PRHHub: React.FC<PRHHubProps> = ({
  activeTab,
  setActiveTab,
  currentUserEmail = 'admin@mannargreenride.lk',
  themeMode = 'light',
}) => {
  // PRH State
  const [customers, setCustomers] = useState<PRHCustomer[]>(() => getPRHCustomers());
  const [equipment, setEquipment] = useState<PRHEquipment[]>(() => getPRHEquipment());
  const [rentals, setRentals] = useState<PRHRental[]>(() => getPRHRentals());
  const [returns, setReturns] = useState<PRHReturnRecord[]>(() => getPRHReturns());
  const [payments, setPayments] = useState<PRHPayment[]>(() => getPRHPayments());
  const [finance, setFinance] = useState<PRHFinanceTransaction[]>(() => getPRHFinanceTransactions());
  const [reservations, setReservations] = useState<PRHReservation[]>(() => getPRHReservations());
  const [maintenance, setMaintenance] = useState<PRHMaintenance[]>(() => getPRHMaintenance());
  const [templates, setTemplates] = useState(() => getPRHReminderTemplates());
  const [notificationLogs, setNotificationLogs] = useState<PRHNotificationLog[]>(() =>
    getPRHNotificationLogs()
  );
  const [settings, setSettings] = useState<PRHSettings>(() => getPRHSettings());

  // Return modal trigger state
  const [activeRentalToReturn, setActiveRentalToReturn] = useState<PRHRental | null>(null);

  // Sync state changes to localStorage
  const updateCustomers = (newCusts: PRHCustomer[]) => {
    setCustomers(newCusts);
    savePRHCustomers(newCusts);
  };

  const updateEquipment = (newEq: PRHEquipment[]) => {
    setEquipment(newEq);
    savePRHEquipment(newEq);
  };

  const updateRentals = (newRentals: PRHRental[]) => {
    setRentals(newRentals);
    savePRHRentals(newRentals);
  };

  const updateReturns = (newReturns: PRHReturnRecord[]) => {
    setReturns(newReturns);
    savePRHReturns(newReturns);
  };

  const updatePayments = (newPayments: PRHPayment[]) => {
    setPayments(newPayments);
    savePRHPayments(newPayments);
  };

  const updateFinance = (newFinance: PRHFinanceTransaction[]) => {
    setFinance(newFinance);
    savePRHFinanceTransactions(newFinance);
  };

  const updateReservations = (newRes: PRHReservation[]) => {
    setReservations(newRes);
    savePRHReservations(newRes);
  };

  const updateMaintenance = (newMnt: PRHMaintenance[]) => {
    setMaintenance(newMnt);
    savePRHMaintenance(newMnt);
  };

  const updateTemplates = (newTpls: any[]) => {
    setTemplates(newTpls);
    savePRHReminderTemplates(newTpls);
  };

  const updateNotifications = (newLogs: PRHNotificationLog[]) => {
    setNotificationLogs(newLogs);
    savePRHNotificationLogs(newLogs);
  };

  const updateSettings = (newSettings: PRHSettings) => {
    setSettings(newSettings);
    savePRHSettings(newSettings);
  };

  // --- Workflow Handlers ---

  // Handle New Rental Save (with auto-posting to PRH Finance and Payments)
  const handleSaveRental = (
    newRental: PRHRental,
    updatedEquipmentList: PRHEquipment[],
    newCustomer?: PRHCustomer
  ) => {
    const updatedRentalsList = [newRental, ...rentals];
    updateRentals(updatedRentalsList);
    updateEquipment(updatedEquipmentList);

    if (newCustomer) {
      updateCustomers([newCustomer, ...customers]);
    }

    // Auto post advance payment to PRH Finance if paid
    if (newRental.paidAmount > 0) {
      const financeTxId = `PRH-FIN-ADV-${Date.now().toString().slice(-6)}`;
      const timestamp = new Date().toISOString();

      const newFinanceTx: PRHFinanceTransaction = {
        id: financeTxId,
        business_unit: 'PRH',
        date: newRental.startDate,
        type: 'income',
        category: 'Rental Income',
        description: `Advance rental payment for contract ${newRental.rentalNumber}`,
        amount: newRental.paidAmount,
        debit: 0,
        credit: newRental.paidAmount,
        balance: newRental.paidAmount,
        payment_method: newRental.paymentMethod,
        reference: newRental.rentalNumber,
        customer_name: newRental.customerName,
        rental_number: newRental.rentalNumber,
        created_by: currentUserEmail,
        created_at: timestamp,
      };

      const newPayment: PRHPayment = {
        id: `PRH-PAY-ADV-${Date.now().toString().slice(-6)}`,
        businessUnit: 'PRH',
        rentalId: newRental.id,
        rentalNumber: newRental.rentalNumber,
        customerId: newRental.customerId,
        customerName: newRental.customerName,
        type: 'rental_advance',
        amount: newRental.paidAmount,
        paymentMethod: newRental.paymentMethod as any,
        reference: newRental.rentalNumber,
        date: newRental.startDate,
        enteredBy: currentUserEmail,
        remarks: 'Contract signing advance payment',
      };

      updateFinance([newFinanceTx, ...finance]);
      updatePayments([newPayment, ...payments]);
    }
  };

  // Handle Return Processing
  const handleProcessReturn = (
    returnRecord: PRHReturnRecord,
    updatedRental: PRHRental,
    updatedEquipmentList: PRHEquipment[],
    financeTransactions: PRHFinanceTransaction[]
  ) => {
    updateReturns([returnRecord, ...returns]);
    updateRentals(rentals.map((r) => (r.id === updatedRental.id ? updatedRental : r)));
    updateEquipment(updatedEquipmentList);

    if (financeTransactions.length > 0) {
      updateFinance([...financeTransactions, ...finance]);
    }

    setActiveRentalToReturn(null);
  };

  // Handle Payment Recording
  const handleRecordPayment = (payment: PRHPayment, updatedRental: PRHRental) => {
    updatePayments([payment, ...payments]);
    updateRentals(rentals.map((r) => (r.id === updatedRental.id ? updatedRental : r)));

    const newFinanceTx: PRHFinanceTransaction = {
      id: `PRH-FIN-PAY-${Date.now().toString().slice(-6)}`,
      business_unit: 'PRH',
      date: payment.date,
      type: 'income',
      category: 'Rental Income',
      description: `Payment settlement for contract ${updatedRental.rentalNumber}`,
      amount: payment.amount,
      debit: 0,
      credit: payment.amount,
      balance: payment.amount,
      payment_method: payment.paymentMethod,
      reference: payment.reference,
      customer_name: updatedRental.customerName,
      rental_number: updatedRental.rentalNumber,
      created_by: currentUserEmail,
      created_at: new Date().toISOString(),
    };

    updateFinance([newFinanceTx, ...finance]);
  };

  // Switch to return tab for a specific rental
  const handleOpenReturnModalForRental = (rental: PRHRental) => {
    setActiveRentalToReturn(rental);
    setActiveTab('prh-returns');
  };

  // Trigger WhatsApp reminder dispatch
  const handleSendWhatsAppReminder = (rental: PRHRental, templateType: string) => {
    setActiveTab('prh-reminders');
  };

  return (
    <div className="w-full">
      {activeTab === 'prh-dashboard' && (
        <PRHDashboardView
          rentals={rentals}
          customers={customers}
          equipment={equipment}
          finance={finance}
          onNavigateTab={setActiveTab}
        />
      )}

      {activeTab === 'prh-new-rental' && (
        <PRHNewRentalView
          customers={customers}
          equipment={equipment}
          rentals={rentals}
          currentUserEmail={currentUserEmail}
          onSaveRental={handleSaveRental}
          onNavigateTab={setActiveTab}
        />
      )}

      {activeTab === 'prh-active-rentals' && (
        <PRHActiveRentalsView
          rentals={rentals}
          equipment={equipment}
          customers={customers}
          currentUserEmail={currentUserEmail}
          onOpenReturnModal={handleOpenReturnModalForRental}
          onUpdateRental={(updated) =>
            updateRentals(rentals.map((r) => (r.id === updated.id ? updated : r)))
          }
          onRecordPayment={handleRecordPayment}
          onSendWhatsAppReminder={handleSendWhatsAppReminder}
          onNavigateTab={setActiveTab}
        />
      )}

      {activeTab === 'prh-returns' && (
        <PRHReturnsView
          rentals={rentals}
          equipment={equipment}
          returnsHistory={returns}
          activeRentalToReturn={activeRentalToReturn}
          currentUserEmail={currentUserEmail}
          onProcessReturn={handleProcessReturn}
          onCloseReturnModal={() => setActiveRentalToReturn(null)}
          onNavigateTab={setActiveTab}
        />
      )}

      {activeTab === 'prh-customers' && (
        <PRHCustomersView
          customers={customers}
          currentUserEmail={currentUserEmail}
          onSaveCustomer={(customer) => {
            const exists = customers.some((c) => c.id === customer.id);
            if (exists) {
              updateCustomers(customers.map((c) => (c.id === customer.id ? customer : c)));
            } else {
              updateCustomers([customer, ...customers]);
            }
          }}
          onDeleteCustomer={(id) => updateCustomers(customers.filter((c) => c.id !== id))}
        />
      )}

      {activeTab === 'prh-equipment' && (
        <PRHEquipmentView
          equipment={equipment}
          currentUserEmail={currentUserEmail}
          onSaveEquipment={(eq) => {
            const exists = equipment.some((e) => e.id === eq.id);
            if (exists) {
              updateEquipment(equipment.map((e) => (e.id === eq.id ? eq : e)));
            } else {
              updateEquipment([eq, ...equipment]);
            }
          }}
          onDeleteEquipment={(id) => updateEquipment(equipment.filter((e) => e.id !== id))}
        />
      )}

      {activeTab === 'prh-inventory' && (
        <PRHInventoryView
          equipment={equipment}
          onUpdateEquipmentStock={updateEquipment}
        />
      )}

      {activeTab === 'prh-reservations' && (
        <PRHReservationsView
          reservations={reservations}
          customers={customers}
          equipment={equipment}
          currentUserEmail={currentUserEmail}
          onSaveReservation={(res) => updateReservations([res, ...reservations])}
        />
      )}

      {activeTab === 'prh-payments' && <PRHPaymentsView payments={payments} />}

      {activeTab === 'prh-finance' && (
        <PRHFinanceView
          transactions={finance}
          currentUserEmail={currentUserEmail}
          onAddTransaction={(tx) => updateFinance([tx, ...finance])}
        />
      )}

      {activeTab === 'prh-maintenance' && (
        <PRHMaintenanceView
          maintenanceRecords={maintenance}
          equipment={equipment}
          currentUserEmail={currentUserEmail}
          onSaveMaintenance={(m) => updateMaintenance([m, ...maintenance])}
        />
      )}

      {activeTab === 'prh-reminders' && (
        <PRHRemindersView
          templates={templates}
          notificationLogs={notificationLogs}
          rentals={rentals}
          customers={customers}
          currentUserEmail={currentUserEmail}
          onSaveTemplates={updateTemplates}
          onLogNotification={(log) => updateNotifications([log, ...notificationLogs])}
        />
      )}

      {activeTab === 'prh-reports' && (
        <PRHReportsView
          rentals={rentals}
          customers={customers}
          equipment={equipment}
          finance={finance}
        />
      )}

      {activeTab === 'prh-settings' && (
        <PRHSettingsView settings={settings} onSaveSettings={updateSettings} />
      )}
    </div>
  );
};
