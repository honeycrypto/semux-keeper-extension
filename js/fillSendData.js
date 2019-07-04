'use strict'
/* global $, chrome, fetch */
import { getExchangeRate } from './utils/exchanges.js'
import { getLastActiveAccount } from './utils/accounts.js'

const API = 'https://api.testnet.semux.online/v2.2.0/'

var userAmount

async function fillSenderData () {
  let activeAccount = await getLastActiveAccount()
  const response = await fetch(API + 'account?address=' + activeAccount.address)
  const addressData = await response.json()
  const availableBal = formatAmount(addressData.result.available)
  userAmount = availableBal
  const price = await getExchangeRate('usd')
  const usdAmount = (price * availableBal).toFixed(2)
  $('div.senderAccount p.senderName').text(activeAccount.name)
  $('div.senderAccount p.senderAmount').text((availableBal).toFixed(5) + ' SEM')
  $('div.senderAccount p.senderUsdValue').text(usdAmount + ' USD')
  if (!parseFloat(usdAmount)) {
    $('div.senderAccount p.senderUsdValue').hide()
  }
  // if we have some data in txData -> then we need to fill all fields
  chrome.storage.local.get('txData', (result) => {
    if (result.txData) {
      $('input.toAddress').val(result.txData.toAddress)
      $('input.amount').val(result.txData.amount)
    }
  })
}

fillSenderData()

$('input.toAddress').on('change', function (e) {
  const value = $(this).val()
  if (!isAddress(value)) {
    $('button.goToApprovePage').prop('disabled', true)
    $('span.invalidAddress').show()
    $('span.invalidAddress').text('Invalid address')
  } else {
    $('span.invalidAddress').hide()
    $('button.goToApprovePage').prop('disabled', false)
  }
})

$('input.amount').on('change', function (e) {
  let value = $(this).val()
  if (value.includes(',')) {
    value = value.replace(/,/g, '.')
  }
  let amount = parseFloat(value)
  if (!amount || amount > userAmount + 0.005) {
    $('button.goToApprovePage').prop('disabled', true)
    $('span.invalidAmount').show()
    $('span.invalidAmount').text('Invalid amount')
  } else {
    $('span.invalidAmount').hide()
    $('button.goToApprovePage').prop('disabled', false)
  }
})

$('button.goToApprovePage').on('click', function (e) {
  e.preventDefault()
  const toAddress = $('input.toAddress').val()
  const amount = $('input.amount').val()
  var type = $('h3.h3title').text()
  type = type.split(' ')[0]
  if (type === 'Send') {
    if (!amount || !toAddress) {
      return $('span.error').text('Please input amount and reciever')
    }
  } else {
    if (!amount) {
      return $('span.error').text('Please input amount and valdiator')
    }
  }
  console.log(type)
  chrome.storage.local.get('txData', async (result) => {
    var validatorAddress, fromAddress, privateKeySeleted

    const activeAccount = await getLastActiveAccount()

    // vote tx
    if (!toAddress) {
      validatorAddress = $('select.delegatesList option:selected').attr('data-address')
    }

    const accounts = await getAddressFromStorage()

    for (let i = 0; i < accounts.length; i++) {
      if (accounts[i].address === activeAccount.address) {
        fromAddress = accounts[i].address
        privateKeySeleted = accounts[i].privateKey
      }
    }

    chrome.storage.local.set({ 'txData': {
      type: type || 'Transfer',
      accountName: activeAccount.name,
      fromAddress,
      privateKeySeleted,
      toAddress: toAddress || validatorAddress,
      amount
    } })
    window.location.href = 'confirm.html'
  })
})

function getAddressFromStorage () {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get('accounts', (result) => {
      resolve(result.accounts)
    })
  })
}

function formatAmount (string) {
  const digit = Number(string) / Math.pow(10, 9)
  return digit
}

function isAddress (address) {
  if (address.length === 42) {
    return true
  } else {
    return false
  }
}
